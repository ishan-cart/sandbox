terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.region
}

data "terraform_remote_state" "infra" {
  backend = "s3" # or "remote" for HCP Terraform
  config = {
    bucket = "yeahboi-dev-state"
    key    = "infra/terraform.tfstate"
    region = var.region
  }
}