resource "aws_vpc" "vpc_network" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-vpc"
  }
}

resource "aws_vpc_dhcp_options" "dns_resolver" {
  domain_name_servers = ["AmazonProvidedDNS", "8.8.8.8", "8.8.4.4"]
}

resource "aws_vpc_dhcp_options_association" "dns_resolver" {
  vpc_id          = aws_vpc.vpc_network.id
  dhcp_options_id = aws_vpc_dhcp_options.dns_resolver.id
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-southeast-2a"

  tags = {
    Name                     = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-pub-subnet-1"
    Tier                     = "public"
    "kubernetes.io/role/elb" = 1
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-southeast-2b"

  tags = {
    Name                     = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-pub-subnet-2"
    Tier                     = "public"
    "kubernetes.io/role/elb" = 1
  }
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.31.0/24"
  availability_zone = "ap-southeast-2a"

  tags = {
    Name                                                                        = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-priv-subnet-1"
    Tier                                                                        = "private"
    "kubernetes.io/cluster/${local.env_vars[var.environment].eks_cluster_name}" = "owned"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.32.0/24"
  availability_zone = "ap-southeast-2b"

  tags = {
    Name                                                                        = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-priv-subnet-2"
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

resource "aws_eip" "natgw_1" {
  domain = "vpc"
}

resource "aws_eip" "natgw_2" {
  domain = "vpc"
}

resource "aws_nat_gateway" "public_natgw_1" {
  allocation_id = aws_eip.natgw_1.id
  subnet_id     = aws_subnet.public_subnet_1.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-public-natgw-1"
  }

  # To ensure proper ordering, it is recommended to add an explicit dependency
  # on the Internet Gateway for the VPC.
  depends_on = [aws_internet_gateway.igw]
}

resource "aws_nat_gateway" "public_natgw_2" {
  allocation_id = aws_eip.natgw_2.id
  subnet_id     = aws_subnet.public_subnet_2.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-public-natgw-2"
  }

  # To ensure proper ordering, it is recommended to add an explicit dependency
  # on the Internet Gateway for the VPC.
  depends_on = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-public"
  }
}

resource "aws_route" "public" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table" "private_1" {
  vpc_id = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-private-1"
  }
}

resource "aws_route" "private_1" {
  route_table_id         = aws_route_table.private_1.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.public_natgw_1.id
}

resource "aws_route_table" "private_2" {
  vpc_id = aws_vpc.vpc_network.id

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-private-2"
  }
}

resource "aws_route" "private_2" {
  route_table_id         = aws_route_table.private_2.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.public_natgw_2.id
}

resource "aws_route_table_association" "public_subnet_1_route" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_subnet_2_route" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_subnet_1_route" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_1.id
}

resource "aws_route_table_association" "private_subnet_2_route" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_2.id
}

resource "aws_network_acl" "acl" {
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

resource "aws_network_acl_association" "acl_public_subnet_1" {
  network_acl_id = aws_network_acl.acl.id
  subnet_id      = aws_subnet.public_subnet_1.id
}

resource "aws_network_acl_association" "acl_public_subnet_2" {
  network_acl_id = aws_network_acl.acl.id
  subnet_id      = aws_subnet.public_subnet_2.id
}

resource "aws_ec2_subnet_cidr_reservation" "k8s_private_1_reservation" {
  cidr_block       = "10.0.31.96/28"
  reservation_type = "prefix"
  subnet_id        = aws_subnet.private_subnet_1.id
}

resource "aws_ec2_subnet_cidr_reservation" "k8s_private_2_reservation" {
  cidr_block       = "10.0.32.96/28"
  reservation_type = "prefix"
  subnet_id        = aws_subnet.private_subnet_2.id
}

resource "aws_security_group" "fe_lb" {
  name        = "fe-loadbalancer"
  description = "Frontend LB to EKS"
  vpc_id      = aws_vpc.vpc_network.id
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
