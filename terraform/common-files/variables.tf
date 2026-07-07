# tflint-ignore-file: terraform_unused_declarations
variable "region" {
  type    = string
  default = "ap-southeast-2"
}

variable "environment" {
  type    = string
  default = "development"
}
