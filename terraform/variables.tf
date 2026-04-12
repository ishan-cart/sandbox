variable "region" {
  type    = string
  default = "ap-southeast-2"
}

variable "environment" {
  type    = string
  default = "development"
}

variable "github_oidc_subject_pattern" {
  type        = string
  description = "StringLike match for token.actions.githubusercontent.com:sub (tighten to your org/repo)."
  default     = "repo:*/*:*"
}