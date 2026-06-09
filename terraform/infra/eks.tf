resource "aws_eks_cluster" "cluster" {
  # checkov:skip=CKV_AWS_39,CKV_AWS_37
  name = local.env_vars[var.environment].eks_cluster_name

  access_config {
    authentication_mode = "API"
  }

  role_arn = aws_iam_role.cluster.arn
  version  = "1.35"

  vpc_config {
    subnet_ids = [
      aws_subnet.private_subnet_1.id,
      aws_subnet.private_subnet_2.id,
    ]

    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_worker_nodes.id]
    public_access_cidrs     = ["159.196.168.43/32"]
  }

  encryption_config {
    resources = ["secrets"]
    provider {
      key_arn = aws_kms_key.key.arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
  ]
}

resource "aws_iam_role" "cluster" {
  name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-eks-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_launch_template" "eks_worker_nodes" {
  vpc_security_group_ids = []
  network_interfaces {
    security_groups = [
      aws_eks_cluster.cluster.vpc_config[0].cluster_security_group_id,
      aws_security_group.eks_worker_nodes.id,
    ]
  }
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }
}

resource "aws_eks_node_group" "node_group" {
  cluster_name    = aws_eks_cluster.cluster.name
  node_group_name = "${aws_eks_cluster.cluster.name}-node-group"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
  ami_type        = "AL2023_x86_64_STANDARD"
  capacity_type   = "SPOT"
  instance_types  = ["t3.medium"]

  launch_template {
    id      = aws_launch_template.eks_worker_nodes.id
    version = "$Latest"
  }

  scaling_config {
    desired_size = 1
    max_size     = 2
    min_size     = 1
  }

  update_config {
    max_unavailable = 1
  }

  # Ensure that IAM Role permissions are created before and deleted after EKS Node Group handling.
  # Otherwise, EKS will not be able to properly delete EC2 Instances and Elastic Network Interfaces.
  depends_on = [
    aws_iam_role_policy_attachment.node_group_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_group_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_group_AmazonEC2ContainerRegistryReadOnly,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

resource "aws_iam_role" "node_group" {
  name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-node-group"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_group.name
}

resource "aws_eks_access_entry" "admins" {
  cluster_name  = local.env_vars[var.environment].eks_cluster_name
  principal_arn = aws_iam_role.eks_role.arn
  # kubernetes_groups = ["group-1", "group-2"]
  # type              = "STANDARD"

  depends_on = [aws_eks_cluster.cluster]
}

resource "aws_eks_access_policy_association" "allow_admins_cluster_admin" {
  cluster_name  = local.env_vars[var.environment].eks_cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.eks_role.arn

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_cluster.cluster]
}

resource "aws_eks_addon" "vpc-cni" {
  cluster_name = aws_eks_cluster.cluster.name
  addon_name   = "vpc-cni"

  configuration_values = jsonencode({
    env = {
      ENABLE_PREFIX_DELEGATION = "true"
    }
  })
}

resource "aws_iam_openid_connect_provider" "eks_cluster" {
  url            = aws_eks_cluster.cluster.identity[0].oidc[0].issuer
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "AWSLoadBalancerControllerIAMRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks_cluster.arn
        }
        # Condition = {
        #   "StringEquals": {
        #     "${aws_eks_cluster.cluster.identity[0].oidc[0].issuer}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller",
        #     "${aws_eks_cluster.cluster.identity[0].oidc[0].issuer}:aud": "sts.amazonaws.com"
        #   }
        # }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_aws_lbc_role" {
  role       = aws_iam_role.aws_load_balancer_controller.name
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
}

resource "aws_security_group" "eks_worker_nodes" {
  name_prefix = "eks-worker-nodes-"
  description = "EKS worker nodes"
  vpc_id      = aws_vpc.vpc_network.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "eks-worker-nodes"
  }
}

resource "aws_vpc_security_group_ingress_rule" "backend_all_self" {
  security_group_id            = aws_security_group.eks_worker_nodes.id
  description                  = "Allow all inbound from self"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.eks_worker_nodes.id
}

resource "aws_vpc_security_group_ingress_rule" "backend_https" {
  security_group_id            = aws_security_group.eks_worker_nodes.id
  description                  = "Allow https from frontend lb"
  from_port                    = 8443
  ip_protocol                  = "tcp"
  to_port                      = 8443
  referenced_security_group_id = aws_security_group.fe_lb.id
}

resource "aws_vpc_security_group_ingress_rule" "backend_healthcheck" {
  security_group_id            = aws_security_group.eks_worker_nodes.id
  description                  = "Allow healthcheck from frontend lb"
  from_port                    = 1042
  ip_protocol                  = "tcp"
  to_port                      = 1042
  referenced_security_group_id = aws_security_group.fe_lb.id
}

resource "aws_vpc_security_group_egress_rule" "backend_all_self" {
  security_group_id            = aws_security_group.eks_worker_nodes.id
  description                  = "Allow all outbound to self"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.eks_worker_nodes.id
}

resource "aws_vpc_security_group_egress_rule" "backend_2049_efs" {
  security_group_id = aws_security_group.eks_worker_nodes.id
  description       = "Allow 2049 to EFS"
  cidr_ipv4         = aws_vpc.vpc_network.cidr_block
  from_port         = 2049
  ip_protocol       = "tcp"
  to_port           = 2049
}

############# Rules for frontend SG #############

resource "aws_vpc_security_group_egress_rule" "lb_8443" {
  security_group_id            = aws_security_group.fe_lb.id
  description                  = "Allow 8443 traffic to HAProxy backend"
  from_port                    = 8443
  ip_protocol                  = "tcp"
  to_port                      = 8443
  referenced_security_group_id = aws_security_group.eks_worker_nodes.id
}

resource "aws_vpc_security_group_egress_rule" "lb_backend_healthcheck" {
  security_group_id            = aws_security_group.fe_lb.id
  description                  = "Allow HAProxy healthcheck "
  from_port                    = 1042
  ip_protocol                  = "tcp"
  to_port                      = 1042
  referenced_security_group_id = aws_security_group.eks_worker_nodes.id
}

#################################################

resource "aws_iam_role" "eks_ecr_access" {
  name = "allow-eks-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks_cluster.arn
        }
      },
    ]
  })
}

resource "aws_iam_policy" "gitops_ecr_pull" {
  name        = "ECRPullOnly"
  path        = "/gitops/"
  description = "ECR pull only access for GitOps"

  policy = file("./policies/gitops-ecr-access.json")
}

resource "aws_iam_role_policy_attachment" "gitops_ecr_pull_attachment" {
  role       = aws_iam_role.eks_ecr_access.name
  policy_arn = aws_iam_policy.gitops_ecr_pull.arn
}

resource "aws_iam_role" "ebs_csi_controller" {
  name = "allow-eks-ebs-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks_cluster.arn
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi_controller_attachment" {
  role       = aws_iam_role.ebs_csi_controller.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEBSCSIDriverPolicyV2"
}

resource "aws_iam_role" "efs_csi_controller" {
  name = "allow-eks-efs-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks_cluster.arn
        }
        Condition = {
          StringLike = {
            "${aws_iam_openid_connect_provider.eks_cluster.url}:sub" = ["system:serviceaccount:kube-system:efs-csi-*"]
            "${aws_iam_openid_connect_provider.eks_cluster.url}:aud" = "sts.amazonaws.com",
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "efs_csi_controller_attachment" {
  role       = aws_iam_role.efs_csi_controller.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy"
}

resource "aws_iam_role_policy_attachment" "efs_csi_controller_kms_attachment" {
  role       = aws_iam_role.efs_csi_controller.name
  policy_arn = aws_iam_policy.efs_csi_driver_kms.arn
}

resource "aws_iam_policy" "efs_csi_driver_kms" {
  name        = "efs_csi_driver_kms"
  description = "Allow EFS csi driver to use kms key"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowEksEfsCsiDriverToUseKey"
      Effect = "Allow"
      Action = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ]
      Resource = [aws_kms_key.key.arn]
    }]
  })
}
