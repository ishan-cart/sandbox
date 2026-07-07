resource "aws_vpc" "vpc_network" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-vpc"
  }
}

resource "aws_flow_log" "vpc" {
  log_destination      = aws_s3_bucket.access_logs.arn
  log_destination_type = "s3"
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.vpc_network.id
}

resource "aws_default_security_group" "default" {
  vpc_id  = aws_vpc.vpc_network.id
  ingress = []
  egress  = []
}

resource "aws_vpc_dhcp_options" "dns_resolver" {
  domain_name_servers = ["AmazonProvidedDNS", "8.8.8.8", "8.8.4.4"]
}

resource "aws_vpc_dhcp_options_association" "dns_resolver" {
  vpc_id          = aws_vpc.vpc_network.id
  dhcp_options_id = aws_vpc_dhcp_options.dns_resolver.id
}

resource "aws_subnet" "public_subnets" {
  for_each          = local.subnet_map
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = each.value.public
  availability_zone = each.key

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-${each.key}-public"
    Zone = each.key
    Tier = "public"
  }
}

resource "aws_subnet" "private_subnets" {
  for_each          = local.subnet_map
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = each.value.private
  availability_zone = each.key

  tags = {
    Name                                                                        = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-${each.key}-private"
    Zone                                                                        = each.key
    Tier                                                                        = "private"
    "kubernetes.io/cluster/${local.env_vars[var.environment].eks_cluster_name}" = "owned"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-public"
    Tier = "public"
  }
}

resource "aws_route" "public" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table" "private_tables" {
  # Private route table per AZ
  for_each = local.subnet_map
  vpc_id   = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-${each.key}-private"
    Tier = "private"
  }
}

resource "aws_route_table_association" "public_subnets" {
  for_each       = aws_subnet.public_subnets
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_subnets" {
  for_each       = aws_subnet.private_subnets
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private_tables[each.key].id
}

resource "aws_network_acl" "acl" {
  #checkov:skip=CKV_AWS_230,CKV_AWS_229,CKV_AWS_232,CKV_AWS_231
  vpc_id = aws_vpc.vpc_network.id

  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}

resource "aws_network_acl_association" "acl_public_subnets" {
  for_each       = aws_subnet.public_subnets
  network_acl_id = aws_network_acl.acl.id
  subnet_id      = each.value.id
}

resource "aws_ec2_subnet_cidr_reservation" "k8s_private_reservations" {
  for_each         = aws_subnet.private_subnets
  cidr_block       = cidrsubnet(each.value.cidr_block, 4, 6)
  reservation_type = "prefix"
  subnet_id        = each.value.id
}

resource "aws_security_group" "fe_lb" {
  name_prefix = "fe-loadbalancer-sg-"
  description = "Frontend LB to EKS"
  vpc_id      = aws_vpc.vpc_network.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "fe-loadbalancer-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "lb_all_self" {
  security_group_id            = aws_security_group.fe_lb.id
  description                  = "Allow all inbound from self"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.fe_lb.id
}

resource "aws_vpc_security_group_egress_rule" "lb_all_self" {
  security_group_id            = aws_security_group.fe_lb.id
  description                  = "Allow all outbound to self"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.fe_lb.id
}

resource "aws_security_group" "efs" {
  # checkov:skip=CKV2_AWS_5
  name_prefix = "efs-sg-"
  description = "EFS to EKS"
  vpc_id      = aws_vpc.vpc_network.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "efs-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_2049_eks" {
  description                  = "Allow 2049 inbound from EKS worker nodes"
  security_group_id            = aws_security_group.efs.id
  from_port                    = 2049
  ip_protocol                  = "tcp"
  to_port                      = 2049
  referenced_security_group_id = aws_security_group.eks_worker_nodes.id
}
