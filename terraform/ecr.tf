resource "aws_ecr_repository" "repo" {
  name                 = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}"
  image_tag_mutability = "MUTABLE_WITH_EXCLUSION"

  image_tag_mutability_exclusion_filter {
    filter      = "v*"
    filter_type = "WILDCARD"
  }
}