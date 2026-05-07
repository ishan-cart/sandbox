terraform {
  required_providers {
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

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  exec {
    api_version = "client.authentication.k8s.io/v1"
    args        = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.cluster.name, "--profile", "k8s-admin"]
    command     = "aws"
  }
}

provider "helm" {
  kubernetes = {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    exec = {
      api_version = "client.authentication.k8s.io/v1"
      args        = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.cluster.name, "--profile", "k8s-admin"]
      command     = "aws"
    }
  }
}
