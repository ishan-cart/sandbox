import json
from typing import Any, Generator
from unittest.mock import MagicMock, patch
import pytest
from botocore.exceptions import ClientError

from rotate_cloudflare_token import lambda_handler, CLOUDFLARE_BASE_URL

# --- Test Constants Configuration ---
MOCK_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-token"
MOCK_CLIENT_TOKEN = "mock-token-uuid-12345"

@pytest.fixture
def mock_boto_client() -> Generator[MagicMock, None, None]:
    """Fixtures to mock the boto3 secretsmanager client."""
    with patch("rotate_cloudflare_token.client") as mock_client:
        yield mock_client

@pytest.fixture
def mock_urlopen() -> Generator[MagicMock, None, None]:
    """Fixtures to mock urllib.request.urlopen."""
    with patch("urllib.request.urlopen") as mock_url:
        yield mock_url

@pytest.fixture
def mock_event() -> dict[str, str]:
    """Helper fixture to generate generic AWS SM event payloads."""
    return {
        "SecretId": MOCK_SECRET_ARN,
        "ClientRequestToken": MOCK_CLIENT_TOKEN,
        "Step": "createSecret"
    }

def create_mock_response(status_code: int, json_data: dict[str, Any]) -> MagicMock:
    """Helper to create a mock HTTP response object for urllib."""
    mock_resp = MagicMock()
    mock_resp.status = status_code
    mock_resp.read.return_value = json.dumps(json_data).encode("utf-8")
    return mock_resp


## --- Test Cases ---

def test_lambda_handler_rotation_disabled(mock_boto_client: MagicMock, mock_event: dict[str, str]) -> None:
    """Should raise ValueError if RotationEnabled is False."""
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": False}

    with pytest.raises(ValueError, match="Rotation is not enabled"):
        lambda_handler(mock_event, None)


def test_create_secret_success(mock_boto_client: MagicMock, mock_urlopen: MagicMock, mock_event: dict[str, str]) -> None:
    """Tests dynamic cloning path during createSecret."""
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": True}
    
    mock_boto_client.get_secret_value.side_effect = [
        {"SecretString": json.dumps({"token": "old-cf-token", "token_id": "old-id"})}, 
        ClientError(
            {"Error": {"Code": "ResourceNotFoundException", "Message": "Not Found"}}, 
            "get_secret_value"
        )
    ]
    mock_boto_client.exceptions.ResourceNotFoundException = ClientError

    # Mocking successive HTTP calls: 
    # 1st call: GET token details to retrieve policies
    # 2nd call: POST to create the token with cloned policies
    cloned_policies = [
        {
            "effect": "allow",
            "resources": {"com.cloudflare.api.account.zone.*": "*"},
            "permission_groups": [{"id": "some-dynamic-permission-id-abc"}]
        }
    ]
    cf_get_details_payload = {"result": {"id": "old-id", "policies": cloned_policies}}
    cf_post_create_payload = {"result": {"id": "new-token-id-xyz", "value": "new-actual-cloudflare-token-string"}}
    
    mock_urlopen.return_value.__enter__.side_effect = [
        create_mock_response(200, cf_get_details_payload),
        create_mock_response(200, cf_post_create_payload)
    ]

    lambda_handler(mock_event, None)

    # Validate that put_secret_value was run with the newly rotated metadata payload
    mock_boto_client.put_secret_value.assert_called_once_with(
        SecretId=mock_event["SecretId"],
        ClientRequestToken=mock_event["ClientRequestToken"],
        SecretString=json.dumps({"token": "new-actual-cloudflare-token-string", "token_id": "new-token-id-xyz"}),
        VersionStages=["AWSPENDING"]
    )


def test_set_secret_success(mock_boto_client: MagicMock, mock_event: dict[str, str]) -> None:
    """Tests setSecret path ensuring it checks for AWSPENDING presence."""
    mock_event["Step"] = "setSecret"
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": True}
    mock_boto_client.get_secret_value.return_value = {"SecretString": "exists"}

    lambda_handler(mock_event, None)
    
    mock_boto_client.get_secret_value.assert_called_once_with(
        SecretId=mock_event["SecretId"], 
        VersionId=mock_event["ClientRequestToken"], 
        VersionStage="AWSPENDING"
    )


def test_test_secret_success(mock_boto_client: MagicMock, mock_urlopen: MagicMock, mock_event: dict[str, str]) -> None:
    """Tests testSecret path checking if the newly issued token validates cleanly against Cloudflare."""
    mock_event["Step"] = "testSecret"
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": True}
    mock_boto_client.get_secret_value.return_value = {
        "SecretString": json.dumps({"token": "pending-token-string", "token_id": "pending-id"})
    }

    cf_response_payload = {"result": {"status": "active"}}
    mock_urlopen.return_value.__enter__.return_value = create_mock_response(200, cf_response_payload)

    lambda_handler(mock_event, None)
    
    args, _ = mock_urlopen.call_args
    req = args[0]
    assert req.full_url == f"{CLOUDFLARE_BASE_URL}/verify"


def test_test_secret_inactive_fails(mock_boto_client: MagicMock, mock_urlopen: MagicMock, mock_event: dict[str, str]) -> None:
    """Tests testSecret path where Cloudflare returns status != active."""
    mock_event["Step"] = "testSecret"
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": True}
    mock_boto_client.get_secret_value.return_value = {
        "SecretString": json.dumps({"token": "pending-token-string", "token_id": "pending-id"})
    }

    cf_response_payload = {"result": {"status": "disabled"}}
    mock_urlopen.return_value.__enter__.return_value = create_mock_response(200, cf_response_payload)

    with pytest.raises(ValueError, match="New Cloudflare token is verified but not active"):
        lambda_handler(mock_event, None)


def test_finish_secret_success(mock_boto_client: MagicMock, mock_urlopen: MagicMock, mock_event: dict[str, str]) -> None:
    """Tests finishSecret path where AWSPENDING is promoted and old Cloudflare token gets deleted."""
    mock_event["Step"] = "finishSecret"
    mock_boto_client.describe_secret.return_value = {"RotationEnabled": True}
    
    mock_boto_client.get_secret_value.side_effect = [
        {"VersionId": "old-version-uuid", "SecretString": json.dumps({"token": "old-token-val", "token_id": "old-id-xyz"})},
        {"VersionId": mock_event["ClientRequestToken"], "SecretString": json.dumps({"token": "new-token-val", "token_id": "new-id-abc"})}
    ]
    
    mock_urlopen.return_value.__enter__.return_value = create_mock_response(200, {"success": True})

    lambda_handler(mock_event, None)

    mock_boto_client.update_secret_version_stage.assert_called_once_with(
        SecretId=mock_event["SecretId"],
        VersionStage="AWSCURRENT",
        MoveToVersionId=mock_event["ClientRequestToken"],
        RemoveFromVersionId="old-version-uuid"
    )
    
    args, _ = mock_urlopen.call_args
    req = args[0]
    assert req.method == "DELETE"
    assert req.full_url == f"{CLOUDFLARE_BASE_URL}/old-id-xyz"