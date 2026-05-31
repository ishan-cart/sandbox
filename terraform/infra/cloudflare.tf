resource "aws_secretsmanager_secret" "cloudflare_token" {
  name       = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-cloudflare-token"
  kms_key_id = aws_kms_key.key.id
}

data "cloudflare_ip_ranges" "ip_ranges" {
  networks = "networks"
}

resource "cloudflare_dns_record" "cname_root" {
  zone_id = local.env_vars[var.environment].zone_id
  name    = "@"
  ttl     = 1
  type    = "CNAME"
  content = aws_lb.front_end.dns_name
  proxied = true
}

resource "cloudflare_dns_record" "cname_wildcard" {
  zone_id = local.env_vars[var.environment].zone_id
  name    = "*"
  ttl     = 1
  type    = "CNAME"
  content = aws_lb.front_end.dns_name
  proxied = true
}

resource "aws_vpc_security_group_ingress_rule" "lb_cloudflare_ips" {
  for_each          = toset(data.cloudflare_ip_ranges.ip_ranges.ipv4_cidrs)
  security_group_id = aws_security_group.fe_lb.id
  description       = "Allow https inbound from cloudflare"
  cidr_ipv4         = each.value
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "lb_https" {
  security_group_id = aws_security_group.fe_lb.id
  description       = "Allow https inbound from my ip"
  cidr_ipv4         = "159.196.168.43/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_secretsmanager_secret_rotation" "rotation" {
  secret_id           = aws_secretsmanager_secret.cloudflare_token.id
  rotation_lambda_arn = aws_lambda_function.rotate_cloudflare_token.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

data "archive_file" "rotate_cloudflare_token" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/rotate-cloudflare-token/rotate_cloudflare_token.py"
  output_path = "${path.module}/lambda/rotate_cloudflare_token.zip"
}

resource "aws_lambda_function" "rotate_cloudflare_token" {
  filename      = data.archive_file.rotate_cloudflare_token.output_path
  function_name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-rotate-cloudflare-token"
  role          = aws_iam_role.lambda_secrets_access.arn
  handler       = "rotate_cloudflare_token.handler"
  code_sha256   = data.archive_file.rotate_cloudflare_token.output_base64sha256

  runtime = "python3.14"

  environment {
    variables = {
      ENVIRONMENT = "development"
      LOG_LEVEL   = "info"
    }
  }

  tags = {
    Environment = "development"
    Application = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-rotate-cloudflare-token"
  }
}

resource "aws_iam_role" "lambda_secrets_access" {
  name               = "allow-lambda-secrets-access"
  assume_role_policy = jsonencode({
    Effect = "Allow"
    Principal = {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    Action = ["sts:AssumeRole"]
  })
}

resource "aws_iam_policy" "lambda_secrets_access_policy" {
  name        = "AWSLambdaSecretsManagerRotationPolicy"
  description = "Allow Lambda to read/rotate secrets"
  policy      = file("./policies/lambda-sm-access.json")
}