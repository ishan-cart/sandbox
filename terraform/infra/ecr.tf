resource "aws_ecr_repository_creation_template" "repo_template" {
  prefix               = local.env_vars[var.environment].project
  image_tag_mutability = "MUTABLE_WITH_EXCLUSION"

  applied_for = [
    "CREATE_ON_PUSH",
    "PULL_THROUGH_CACHE",
  ]

  image_tag_mutability_exclusion_filter {
    filter_type = "WILDCARD"
    filter      = "v*"
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}
