import json
import unittest
from unittest.mock import MagicMock, patch

import rotate_cloudflare_token


class TestCloudflareTokenRotation(unittest.TestCase):

    def setUp(self):
        self.secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:cloudflare-test"
        self.token_uuid = "12345678-abcd-1234-abcd-1234567890af"
        
        # Test configurations
        self.old_app_token = "someoldtoken"
        self.master_token = "somemastertoken"
        self.new_app_token = "somenewtoken"
        self.old_token_id = "someoldtokenid"

        self.mock_secret_dict = {
            "CLOUDFLARE_API_TOKEN": self.old_app_token,
            "LAMBDA_ROTATOR_TOKEN": self.master_token
        }
        self.mock_secret_string = json.dumps(self.mock_secret_dict)

    @patch('rotate_cloudflare_token.client')
    @patch('urllib.request.urlopen')
    def test_create_secret_success(self, mock_urlopen, mock_secrets_client):
        """Test the entire creation sequence including policy cloning."""
        
        # 1. Mock AWS Secrets Manager behaviors
        mock_secrets_client.get_secret_value.side_effect = [
            Exception("Version does not exist"),         # Idempotency check fails (means clean run)
            {"SecretString": self.mock_secret_string}    # Fetching AWSCURRENT configuration
        ]

        # 2. Mock Cloudflare's sequential HTTP responses
        mock_verify_resp = MagicMock()
        mock_verify_resp.read.return_value = json.dumps({
            "success": True, "result": {"id": self.old_token_id}
        }).encode('utf-8')

        mock_policy_resp = MagicMock()
        mock_policy_resp.read.return_value = json.dumps({
            "success": True, 
            "result": {"policies": [{"effect": "allow", "resources": {}, "permission_groups": [{"id": "dns-write-id"}]}]}
        }).encode('utf-8')

        mock_create_resp = MagicMock()
        mock_create_resp.read.return_value = json.dumps({
            "success": True, "result": {"value": self.new_app_token}
        }).encode('utf-8')

        # Chain urlopen Context Managers together to match sequence calls
        mock_urlopen.side_effect = [
            MagicMock(__enter__=MagicMock(return_value=mock_verify_resp)),
            MagicMock(__enter__=MagicMock(return_value=mock_policy_resp)),
            MagicMock(__enter__=MagicMock(return_value=mock_create_resp))
        ]

        # Run creation step
        rotate_cloudflare_token.create_secret(self.secret_arn, self.token_uuid)

        # 3. Verify target modifications saved under AWSPENDING tier
        expected_saved_dict = {
            "CLOUDFLARE_API_TOKEN": self.new_app_token,
            "LAMBDA_ROTATOR_TOKEN": self.master_token
        }
        mock_secrets_client.put_secret_value.assert_called_once_with(
            SecretId=self.secret_arn,
            ClientRequestToken=self.token_uuid,
            SecretString=json.dumps(expected_saved_dict),
            VersionStages=['AWSPENDING']
        )

    @patch('rotate_cloudflare_token.client')
    @patch('urllib.request.urlopen')
    def test_test_secret_success(self, mock_urlopen, mock_secrets_client):
        """Test validation stage extracts the correct staging variant."""
        mock_secrets_client.get_secret_value.return_value = {"SecretString": self.mock_secret_string}

        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"success": True}).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        rotate_cloudflare_token.test_secret(self.secret_arn, self.token_uuid)

        mock_secrets_client.get_secret_value.assert_called_once_with(
            SecretId=self.secret_arn, VersionId=self.token_uuid, VersionStage="AWSPENDING"
        )

    @patch('rotate_cloudflare_token.client')
    @patch('urllib.request.urlopen')
    def test_finish_secret_with_successful_cleanup(self, mock_urlopen, mock_secrets_client):
        """Test final stage promotion and that old token data is pre-fetched and deleted."""
        
        # Mocking describe_secret metadata tracking list
        mock_secrets_client.describe_secret.return_value = {
            "VersionIdsToStages": {"old-version-uuid-111": ["AWSCURRENT"]}
        }
        # Returns old secret configuration state payload
        mock_secrets_client.get_secret_value.return_value = {"SecretString": self.mock_secret_string}

        # Mock Cloudflare responses for verifying and then deleting old token ID
        mock_verify_resp = MagicMock()
        mock_verify_resp.read.return_value = json.dumps({
            "success": True, "result": {"id": self.old_token_id}
        }).encode('utf-8')

        mock_delete_resp = MagicMock()
        mock_delete_resp.read.return_value = json.dumps({"success": True}).encode('utf-8')

        mock_urlopen.side_effect = [
            MagicMock(__enter__=MagicMock(return_value=mock_verify_resp)),
            MagicMock(__enter__=MagicMock(return_value=mock_delete_resp))
        ]

        # Run completion step
        rotate_cloudflare_token.finish_secret(self.secret_arn, self.token_uuid)

        # Confirm old secret data lookups happened correctly
        mock_secrets_client.get_secret_value.assert_called_once_with(
            SecretId=self.secret_arn, VersionId="old-version-uuid-111"
        )

        # Confirm production stage transition call parameters
        mock_secrets_client.update_secret_version_stage.assert_called_once_with(
            SecretId=self.secret_arn,
            VersionStage="AWSCURRENT",
            MoveToVersionId=self.token_uuid,
            RemoveFromVersionId="old-version-uuid-111"
        )


if __name__ == '__main__':
    unittest.main()