resource "aws_secretsmanager_secret" "cloudflare_token" {
  name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-cloudflare-token"
}