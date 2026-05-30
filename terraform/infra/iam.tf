resource "aws_iam_openid_connect_provider" "github_oidc_provider" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

resource "aws_iam_role" "github_oidc_role" {
  name = "github_oidc_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc_provider.arn
        }
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" : "repo:${local.github_user}/${local.repository}:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" : "sts.amazonaws.com",
          }
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_oidc_admin" {
  # checkov:skip=CKV_AWS_274
  role       = aws_iam_role.github_oidc_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_user" "ishans" {
  # checkov:skip=CKV_AWS_273
  name = "ishans"
}

resource "aws_iam_group" "admins" {
  name = "admins"
  path = "/users/"
}

resource "aws_iam_group_policy_attachments_exclusive" "admin_policies" {
  group_name = aws_iam_group.admins.name
  policy_arns = [
    "arn:aws:iam::aws:policy/AWSAccountActivityAccess",
    "arn:aws:iam::aws:policy/AWSBillingReadOnlyAccess",
    "arn:aws:iam::aws:policy/AdministratorAccess",
    "arn:aws:iam::aws:policy/job-function/Billing",
  ]
}

resource "aws_iam_role" "eks_role" {
  name = "allow_user_eks_access"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.env_vars[var.environment].project_id}:root"
        }
      },
    ]
  })
}

output "eks_role_arn" {
  value = aws_iam_role.eks_role.arn
}

resource "aws_iam_group_policy" "admins" {
  name  = "allow_assume_eks_role"
  group = aws_iam_group.admins.name

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole",
        ]
        Effect   = "Allow"
        Resource = aws_iam_role.eks_role.arn
      },
    ]
  })
}

resource "aws_iam_policy" "eks_actions" {
  name = "allow_eks_actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "eks:*",
          "iam:ListRoles"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        "Effect" : "Allow",
        "Action" : "ssm:GetParameter",
        "Resource" : "arn:aws:ssm:*:${local.env_vars[var.environment].project_id}:parameter/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_eks_actions" {
  role       = aws_iam_role.eks_role.name
  policy_arn = aws_iam_policy.eks_actions.arn
}

resource "aws_iam_policy" "aws_load_balancer_controller" {
  name   = "AWSLoadBalancerControllerIAMPolicy"
  policy = file("${path.module}/policies/aws-lb-controller.json")
}

data "aws_iam_policy_document" "allow_lambda" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "allow_lambda" {
  name               = "allow-lambda"
  assume_role_policy = data.aws_iam_policy_document.allow_lambda.json
}
