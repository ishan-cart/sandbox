resource "aws_ecr_repository" "web-app" {
  name                 = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-web-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}