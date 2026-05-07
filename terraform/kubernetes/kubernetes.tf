data "aws_eks_cluster" "cluster" {
  name = local.env_vars[var.environment].eks_cluster_name
}

resource "kubernetes_namespace_v1" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      env = var.environment
    }
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "9.5.4"
  namespace  = "argocd"

  depends_on = [ kubernetes_namespace_v1.argocd ]

  values = [
    file("${path.module}/helm/argocd-values.yaml"),

  ]
}

