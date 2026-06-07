data "aws_subnets" "private_subnets" {
  tags = {
    Tier = "private"
  }
}

data "aws_security_group" "efs" {
  tags = {
    Name = "efs-sg"
  }
}

data "aws_kms_key" "key" {
  key_id = "alias/${local.env_vars[var.environment].project}"
}

resource "aws_efs_file_system" "eks_efs" {
  creation_token = "${local.env_vars[var.environment].project}-web-app-nfs-storage"
  encrypted      = true # Enables encryption at rest
  kms_key_id     = data.aws_kms_key.key.arn

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-efs"
  }
}

resource "aws_efs_mount_target" "private_subnets" {
  for_each        = toset(data.aws_subnets.private_subnets.ids)
  file_system_id  = aws_efs_file_system.eks_efs.id
  subnet_id       = each.value
  security_groups = [data.aws_security_group.efs.id]
}

