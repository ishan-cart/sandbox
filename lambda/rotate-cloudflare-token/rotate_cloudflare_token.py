import json
import urllib.error
import urllib.request
from typing import Any, Dict

import boto3

# Configuration
CF_BASE_URL = "https://api.cloudflare.com/client/v4/user/tokens"
client = boto3.client("secretsmanager")


def handler(event: Dict[str, Any], context: Any) -> None:
    arn, token, step = event["SecretId"], event["ClientRequestToken"], event["Step"]

    if not client.describe_secret(SecretId=arn).get("RotationEnabled", False):
        print(f"Secret {arn} is not enabled for rotation")
        return

    if step == "createSecret":
        create_secret(arn, token)
    elif step == "testSecret":
        test_secret(arn, token)
    elif step == "finishSecret":
        finish_secret(arn, token)
    elif step == "setSecret":
        print("setSecret: Skipping.")


def create_secret(arn: str, token: str) -> None:
    try:
        client.get_secret_value(SecretId=arn, VersionId=token)
        print(f"createSecret: Version {token} exists. Skipping.")
        return
    except Exception:
        pass

    secret_dict = json.loads(
        client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")["SecretString"]
    )
    app_token = secret_dict.get("CLOUDFLARE_API_TOKEN")
    master_token = secret_dict.get("LAMBDA_ROTATOR_TOKEN")

    if not app_token or not master_token:
        raise ValueError("Missing 'CLOUDFLARE_API_TOKEN' or 'LAMBDA_ROTATOR_TOKEN'")

    try:
        # Get Token ID
        req = urllib.request.Request(
            f"{CF_BASE_URL}/verify", headers={"Authorization": f"Bearer {app_token}"}
        )
        with urllib.request.urlopen(req) as r:
            token_id = json.loads(r.read().decode())["result"]["id"]

        # Get existing policies
        req = urllib.request.Request(
            f"{CF_BASE_URL}/{token_id}",
            headers={"Authorization": f"Bearer {master_token}"},
        )
        with urllib.request.urlopen(req) as r:
            current_policies = json.loads(r.read().decode())["result"]["policies"]

        # Sanitize policies
        sanitized_policies = [
            {
                "effect": p.get("effect", "allow"),
                "resources": p.get("resources", {}),
                "permission_groups": [
                    {"id": g.get("id")}
                    for g in p.get("permission_groups", [])
                    if g.get("id")
                ],
            }
            for p in current_policies
        ]

        # Create new token
        payload = {
            "name": f"Automated-Rotated-Token-{token[:8]}",
            "policies": sanitized_policies,
        }
        req = urllib.request.Request(
            CF_BASE_URL,
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {master_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as r:
            secret_dict["CLOUDFLARE_API_TOKEN"] = json.loads(r.read().decode())[
                "result"
            ]["value"]

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Cloudflare error: {e.read().decode()}")
    except Exception as e:
        raise RuntimeError(f"API interaction failed: {str(e)}")

    client.put_secret_value(
        SecretId=arn,
        ClientRequestToken=token,
        SecretString=json.dumps(secret_dict),
        VersionStages=["AWSPENDING"],
    )
    print("createSecret: Saved to AWSPENDING.")


def test_secret(arn: str, token: str) -> None:
    secret_dict = json.loads(
        client.get_secret_value(
            SecretId=arn, VersionId=token, VersionStage="AWSPENDING"
        )["SecretString"]
    )
    req = urllib.request.Request(
        f"{CF_BASE_URL}/verify",
        headers={"Authorization": f"Bearer {secret_dict.get('CLOUDFLARE_API_TOKEN')}"},
    )

    with urllib.request.urlopen(req) as r:
        if json.loads(r.read().decode()).get("success"):
            print("testSecret: Token verification successful!")
        else:
            raise RuntimeError("testSecret: Verification failed.")


def finish_secret(arn: str, token: str) -> None:
    metadata = client.describe_secret(SecretId=arn)
    current_version = next(
        (
            v
            for v, stages in metadata.get("VersionIdsToStages", {}).items()
            if "AWSCURRENT" in stages
        ),
        None,
    )

    if current_version == token:
        print("finishSecret: Already active.")
        return

    # FIX: Read and secure the old token data BEFORE updating any production stages
    old_dict = json.loads(
        client.get_secret_value(SecretId=arn, VersionId=current_version)["SecretString"]
    )
    old_app_token = old_dict.get("CLOUDFLARE_API_TOKEN")
    master_token = old_dict.get("LAMBDA_ROTATOR_TOKEN")

    # Update production stage mapping to the new token
    client.update_secret_version_stage(
        SecretId=arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    print(f"finishSecret: Promoted version {token} to AWSCURRENT.")

    # Cleanup the old token inside Cloudflare using the isolated old configurations
    if old_app_token and master_token:
        try:
            # Resolve the old token's Cloudflare ID string using its own token string
            req = urllib.request.Request(
                f"{CF_BASE_URL}/verify",
                headers={"Authorization": f"Bearer {old_app_token}"},
            )
            with urllib.request.urlopen(req) as r:
                old_token_id = json.loads(r.read().decode())["result"]["id"]

            # Delete the token via the Master token administrator profile
            req = urllib.request.Request(
                f"{CF_BASE_URL}/{old_token_id}",
                headers={"Authorization": f"Bearer {master_token}"},
                method="DELETE",
            )
            with urllib.request.urlopen(req) as r:
                print(
                    f"Successfully deleted old token ID from Cloudflare: {old_token_id}"
                )
        except Exception as e:
            print(f"Cleanup warning: Old token not deleted from Cloudflare: {str(e)}")
