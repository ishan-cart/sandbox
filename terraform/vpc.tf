resource "aws_vpc" "vpc_network" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-vpc"
  }
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-southeast-2a"

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-pub-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-southeast-2b"

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-pub-subnet-2"
  }
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.31.0/24"
  availability_zone = "ap-southeast-2a"

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-priv-subnet-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.vpc_network.id
  cidr_block        = "10.0.32.0/24"
  availability_zone = "ap-southeast-2b"

  tags = {
    Name = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-priv-subnet-2"
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

  route = []

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

  route = []

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

  route = []

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


resource "aws_s3_bucket" "access_logs" {
  bucket = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-access-logs"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "allow_lb_access" {
  bucket = aws_s3_bucket.access_logs.id
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "AWSLoadBalancerWrite",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "logdelivery.elasticloadbalancing.amazonaws.com"
        },
        "Action" : "s3:PutObject",
        "Resource" : "arn:aws:s3:::${aws_s3_bucket.access_logs.bucket}/AWSLogs/${local.env_vars[var.environment].project_id}/*",
      },
    ]
  })
}

resource "aws_lb" "lb" {
  name               = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-lb"
  internal           = false
  load_balancer_type = "application"
  # security_groups    = [aws_security_group.lb_sg.id]
  subnets = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.access_logs.bucket
    enabled = true
  }
}
