

data "aws_iam_policy_document" "kms_key_policy" {
  # checkov:skip=CKV_AWS_356,CKV_AWS_109,CKV_AWS_111 
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${local.env_vars[var.environment].project_id}:root",
        aws_iam_user.ishans.arn,
      ]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowEKSClusterRoleToUseKey"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.cluster.arn]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
      "kms:CreateGrant",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AllowGitHubAdminRoleToUseKey"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.github_oidc_role.arn]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AllowEksEfsCsiDriverToUseKey"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.efs_csi_controller.arn] # hardcode due to cycle condition.
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:CreateGrant",
      "kms:DescribeKey"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AllowLambdaSecretRotation"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:GenerateDataKey"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:EncryptionContext:SecretARN"
      values   = [aws_secretsmanager_secret.cloudflare_token.arn]
    }
  }
}

resource "aws_kms_key" "key" {
  description = "KMS Key"
}

resource "aws_kms_alias" "key" {
  name          = "alias/${local.env_vars[var.environment].project}"
  target_key_id = aws_kms_key.key.key_id
}

resource "aws_kms_key_policy" "key_attachment" {
  key_id = aws_kms_key.key.id
  policy = data.aws_iam_policy_document.kms_key_policy.json
}

# resource "aws_kms_key_policy" "efs_csi_driver_kms" {
#   key_id = aws_kms_key.key.id
#   policy = jsonencode({
#     Id    = "AllowEksEfsCsiDriverToUseKey"
#     Statement = [
#       {
#         Effect = "Allow"
#         Principal = {
#           AWS = aws_iam_role.efs_csi_controller.arn
#         }
#         Action = [
#           "kms:Encrypt",
#           "kms:Decrypt",
#           "kms:ReEncrypt*",
#           "kms:GenerateDataKey*",
#           "kms:CreateGrant",
#           "kms:DescribeKey"
#         ]
#         Resource = ["arn:aws:elasticfilesystem:${var.region}:${local.env_vars[var.environment].project_id}:file-system/*"]
#       }
#     ]
#   })
# }

