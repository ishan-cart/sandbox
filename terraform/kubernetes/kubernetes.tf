data "aws_eks_cluster" "cluster" {
  name = local.env_vars[var.environment].eks_cluster_name
}

data "aws_iam_role" "aws_load_balancer_controller" {
  name = "AWSLoadBalancerControllerIAMRole"
}

data "aws_lb_target_group" "eks_haproxy_backend_https" {
  name = "eks-haproxy-backend-https"
}

data "aws_vpc" "vpc_network" {
  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-vpc"
  }
}

resource "kubernetes_namespace_v1" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      env = var.environment
    }
  }
}

resource "kubernetes_namespace_v1" "ingress" {
  metadata {
    name = "ingress-haproxy"
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

  depends_on = [kubernetes_namespace_v1.argocd]

  values = [
    file("${path.module}/helm/argocd-values.yaml"),
  ]
}

resource "kubernetes_service_account_v1" "aws_load_balancer_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn"     = data.aws_iam_role.aws_load_balancer_controller.arn
      "meta.helm.sh/release-name"      = "aws-load-balancer-controller"
      "meta.helm.sh/release-namespace" = "kube-system"
    }
    labels = {
      "app.kubernetes.io/managed-by" = "Helm"
    }
  }
}

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "3.3.0"
  namespace  = "kube-system"

  values = [
    file("${path.module}/helm/argocd-values.yaml"),
  ]
  set = [
    {
      name  = "clusterName"
      value = data.aws_eks_cluster.cluster.name
    },
    {
      name  = "serviceAccount.name"
      value = kubernetes_service_account_v1.aws_load_balancer_controller.metadata.0.name
    },
    {
      name  = "region"
      value = var.region
    },
    {
      name  = "vpcId"
      value = data.aws_vpc.vpc_network.id
    }
  ]
}

resource "kubernetes_manifest" "haproxy_nlb_target_group_binding" {
  depends_on = [helm_release.aws_load_balancer_controller]
  manifest = {
    apiVersion = "elbv2.k8s.aws/v1beta1"
    kind       = "TargetGroupBinding"
    metadata = {
      name      = "my-tgb"
      namespace = "ingress-haproxy"
    }
    spec = {
      serviceRef = {
        name = "haproxy-kubernetes-ingress"
        port = 443
      }
      targetGroupARN = data.aws_lb_target_group.eks_haproxy_backend_https.arn
      targetType     = "ip"
    }
  }
}
