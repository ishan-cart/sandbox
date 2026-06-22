terraform {
  required_version = ">= 1.14.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.1.0"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1.1"
    }
  }
  backend "s3" {}
}

data "terraform_remote_state" "infra" {
  backend = "s3" # or "remote" for HCP Terraform
  config = {
    bucket = "yeahboi-dev-state"
    key    = "infra/terraform.tfstate"
    region = var.region
  }
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  exec {
    api_version = "client.authentication.k8s.io/v1"
    args        = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.cluster.name, "--role-arn", data.terraform_remote_state.infra.outputs.eks_role_arn]
    command     = "aws"
  }
}

provider "helm" {
  kubernetes = {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    exec = {
      api_version = "client.authentication.k8s.io/v1"
      args        = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.cluster.name, "--role-arn", data.terraform_remote_state.infra.outputs.eks_role_arn]
      command     = "aws"
    }
  }
}
