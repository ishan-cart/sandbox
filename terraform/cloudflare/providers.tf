terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.region
}

provider "cloudflare" {
#   api_token = "CLOUDFLARE_API_TOKEN"
}

