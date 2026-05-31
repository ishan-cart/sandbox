import os
import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional
import boto3
from mypy_boto3_secretsmanager import SecretsManagerClient

# Initialize the Secrets Manager client
client: SecretsManagerClient = boto3.client('secretsmanager')

CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4/user/tokens"

def lambda_handler(event: Dict[str, Any], context: Any) -> None:
    """AWS Lambda handler for Secrets Manager rotation using Dynamic Policy Cloning."""
    arn: str = event['SecretId']
    token: str = event['ClientRequestToken']
    step: str = event['Step']

    metadata = client.describe_secret(SecretId=arn)
    if not metadata.get('RotationEnabled', True):
        raise ValueError(f"Rotation is not enabled for secret {arn}")

    if step == "createSecret":
        create_secret(arn, token)
    elif step == "setSecret":
        set_secret(arn, token)
    elif step == "testSecret":
        test_secret(arn, token)
    elif step == "finishSecret":
        finish_secret(arn, token)
    else:
        raise ValueError(f"Invalid rotation step: {step}")

def create_secret(arn: str, token: str) -> None:
    """Fetches current token policies from Cloudflare and creates an identical AWSPENDING token."""
    current_token_value: str = ""
    current_token_id: str = ""
    
    try:
        current_secret = client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")
        if 'SecretString' in current_secret:
            secret_json = json.loads(current_secret['SecretString'])
            current_token_value = secret_json.get('token', '')
            current_token_id = secret_json.get('token_id', '')
    except Exception:
        # Fallback if executing for the very first time before a rotation has run
        current_token_value = os.environ.get("INITIAL_CLOUDFLARE_TOKEN", "")
        current_token_id = os.environ.get("INITIAL_CLOUDFLARE_TOKEN_ID", "")

    if not current_token_value or not current_token_id:
        raise ValueError("Both current token value and token ID must be available to dynamically clone policies.")

    # Idempotency check: Check if the pending secret already exists
    try:
        client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
        return 
    except client.exceptions.ResourceNotFoundException:
        pass

    # STEP 1: Dynamically fetch policies attached to the current token
    detail_url = f"{CLOUDFLARE_BASE_URL}/{current_token_id}"
    detail_req = urllib.request.Request(
        detail_url,
        headers={"Authorization": f"Bearer {current_token_value}"},
        method="GET"
    )

    try:
        with urllib.request.urlopen(detail_req) as response:
            token_data = json.loads(response.read().decode())
            current_policies = token_data.get("result", {}).get("policies", [])
            if not current_policies:
                raise ValueError(f"No active policies found on token {current_token_id} to clone.")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Cloudflare API error fetching current token details: {e.read().decode()}")

    # STEP 2: Create a new token with the cloned policies
    payload: Dict[str, Any] = {
        "name": f"Rotated-Token-{token[:8]}",
        "policies": current_policies
    }
    
    create_req = urllib.request.Request(
        CLOUDFLARE_BASE_URL, 
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {current_token_value}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(create_req) as response:
            res_data: Dict[str, Any] = json.loads(response.read().decode())
            new_token_value: str = res_data['result']['value']
            new_token_id: str = res_data['result']['id']
            
            secret_dict: Dict[str, str] = {
                "token": new_token_value,
                "token_id": new_token_id
            }
            
            client.put_secret_value(
                SecretId=arn, 
                ClientRequestToken=token, 
                SecretString=json.dumps(secret_dict), 
                VersionStages=['AWSPENDING']
            )
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Cloudflare API error during new token creation: {e.read().decode()}")

def set_secret(arn: str, token: str) -> None:
    """Verifies that the AWSPENDING secret exists."""
    try:
        client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
    except client.exceptions.ResourceNotFoundException:
        raise ValueError(f"Pending secret for token {token} not found during setSecret step.")

def test_secret(arn: str, token: str) -> None:
    """Validates the AWSPENDING Cloudflare token against Cloudflare's verify endpoint."""
    pending = client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
    if 'SecretString' not in pending:
        raise ValueError("Pending secret does not contain a SecretString.")
        
    secret_dict: Dict[str, str] = json.loads(pending['SecretString'])
    
    url = f"{CLOUDFLARE_BASE_URL}/verify"
    req = urllib.request.Request(
        url, 
        headers={"Authorization": f"Bearer {secret_dict['token']}"},
        method="GET"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data: Dict[str, Any] = json.loads(response.read().decode())
            if res_data.get("result", {}).get("status") != "active":
                raise ValueError("New Cloudflare token is verified but not active.")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Cloudflare token verification failed: {e.read().decode()}")

def finish_secret(arn: str, token: str) -> None:
    """Promotes AWSPENDING to AWSCURRENT and deletes the old token from Cloudflare."""
    current_secret = client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")
    
    if current_secret.get('VersionId') == token:
        return

    current_dict: Dict[str, str] = json.loads(current_secret['SecretString'])
    old_token_id: Optional[str] = current_dict.get("token_id")

    client.update_secret_version_stage(
        SecretId=arn, 
        VersionStage="AWSCURRENT", 
        MoveToVersionId=token, 
        RemoveFromVersionId=current_secret.get('VersionId')
    )

    if old_token_id:
        new_secret = client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")
        new_token_value: str = json.loads(new_secret['SecretString'])['token']
        
        url = f"{CLOUDFLARE_BASE_URL}/{old_token_id}"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {new_token_value}"},
            method="DELETE"
        )
        try:
            urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            print(f"Warning: Failed to delete old Cloudflare token {old_token_id}: {e.read().decode()}")