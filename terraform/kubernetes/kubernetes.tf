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

data "aws_iam_role" "eks_ecr_access" {
  name = "allow-eks-ecr-access"
}

data "aws_iam_role" "ebs_csi_controller" {
  name = "allow-eks-ebs-access"
}

data "aws_iam_role" "efs_csi_controller" {
  name = "allow-eks-efs-access"
}

data "aws_efs_file_system" "eks_efs" {
  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-efs"
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
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "9.5.4"
  namespace        = "argocd"
  create_namespace = true
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

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "2.5.0"
  namespace        = "external-secrets"
  create_namespace = true
}

resource "kubernetes_service_account_v1" "external_secrets_ecr" {
  metadata {
    name      = "eso-irsa"
    namespace = "argocd"
    annotations = {
      "eks.amazonaws.com/role-arn"     = data.aws_iam_role.eks_ecr_access.arn
      "meta.helm.sh/release-name"      = "external-secrets"
      "meta.helm.sh/release-namespace" = "external-secrets"
    }
    labels = {
      "app.kubernetes.io/managed-by" = "Helm"
    }
  }
}

resource "kubernetes_manifest" "eso_ecr_token_generator" {
  manifest = {
    apiVersion = "generators.external-secrets.io/v1alpha1"
    kind       = "ECRAuthorizationToken"
    metadata = {
      name      = "ecr-gen"
      namespace = "argocd"
    }
    spec = {
      region = var.region
      auth = {
        jwt = {
          serviceAccountRef = {
            name = kubernetes_service_account_v1.external_secrets_ecr.metadata.0.name
          }
        }
      }
    }
  }
}

resource "kubernetes_manifest" "eso_docker_ecr_secret" {
  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "ExternalSecret"
    metadata = {
      name      = "eso-docker-ecr-secret"
      namespace = "argocd"
    }
    spec = {
      refreshInterval = "1h0m0s"
      target = {
        name = "docker-ecr-secret"
        template = {
          data = {
            ".dockerconfigjson" = <<-EOT
            {
              "auths": {
                "{{ .proxy_endpoint | replace "https://" "" }}": {
                  "username": "{{ .username }}",
                  "password": "{{ .password }}",
                  "auth": "{{ printf "%s:%s" .username .password | b64enc }}"
                }
              }
            }
            
            EOT
          }
          metadata = {
            annotations = {
              expiresAt = "{{ .expires_at }}"
            }
            labels = {
              "argocd.argoproj.io/secret-type" = "repository"
            }
          }
          type = "kubernetes.io/dockerconfigjson"
        }
      }
      dataFrom = [
        {
          sourceRef = {
            generatorRef = {
              apiVersion = "generators.external-secrets.io/v1alpha1"
              kind       = "ECRAuthorizationToken"
              name       = kubernetes_manifest.eso_ecr_token_generator.manifest.metadata.name
            }
          }
        }
      ]
    }
  }
}

resource "kubernetes_manifest" "eso_helm_ecr_secret" {
  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "ExternalSecret"
    metadata = {
      name      = "eso-helm-ecr-secret"
      namespace = "argocd"
    }
    spec = {
      refreshInterval = "1h0m0s"
      target = {
        name = "helm-ecr-secret"
        template = {
          data = {
            url       = "{{ .proxy_endpoint | replace \"https://\" \"\" }}"
            name      = "yeahboi/helm-libraries"
            type      = "helm"
            password  = "{{ .password }}"
            username  = "{{ .username }}"
            enableOCI = "true"
          }
          metadata = {
            annotations = {
              expiresAt = "{{ .expires_at }}"
            }
            labels = {
              "argocd.argoproj.io/secret-type" = "repository"
            }
          }
          type = "Opaque"
        }
      }
      dataFrom = [
        {
          sourceRef = {
            generatorRef = {
              apiVersion = "generators.external-secrets.io/v1alpha1"
              kind       = "ECRAuthorizationToken"
              name       = kubernetes_manifest.eso_ecr_token_generator.manifest.metadata.name
            }
          }
        }
      ]
    }
  }
}

resource "helm_release" "aws_ebs_csi_driver" {
  name       = "aws-ebs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-ebs-csi-driver"
  chart      = "aws-ebs-csi-driver"
  version    = "2.60.0"
  namespace  = "kube-system"

  set = [
    {
      name  = "controller.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
      value = data.aws_iam_role.ebs_csi_controller.arn
    }
  ]
}

resource "helm_release" "aws_efs_csi_driver" {
  name       = "aws-efs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-efs-csi-driver"
  chart      = "aws-efs-csi-driver"
  version    = "4.2.0"
  namespace  = "kube-system"

  set = [
    {
      name  = "controller.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
      value = data.aws_iam_role.efs_csi_controller.arn
    }
  ]
}


resource "kubernetes_manifest" "efs_storage_class" {
  manifest = {
    "apiVersion" = "storage.k8s.io/v1"
    "kind"       = "StorageClass"
    "metadata" = {
      "name" = "efs-sc"
    }
    "parameters" = {
      "basePath"              = "/dynamic_provisioning"
      "directoryPerms"        = "700"
      "ensureUniqueDirectory" = "true"
      "fileSystemId"          = data.aws_efs_file_system.eks_efs.id 
      "gidRangeEnd"           = "70000"
      "gidRangeStart"         = "50000"
      "provisioningMode"      = "efs-ap"
      "reuseAccessPoint"      = "false"
      "subPathPattern"        = "$${.PVC.namespace}/$${.PVC.name}"
    }
    "provisioner"       = "efs.csi.aws.com"
    "volumeBindingMode" = "WaitForFirstConsumer"
    # "mountOptions"      = ["iam"] 
  }
}

