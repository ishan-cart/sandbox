data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
  filter {
    name   = "name"
    values = ["al2023-ami-2023*"]
  }
}

# Fix: Create the Profile Wrapper to attach the Role to the Instance
resource "aws_iam_instance_profile" "nat_profile" {
  name = "diy-nat-instance-profile"
  role = aws_iam_role.nat_route_role.name
}

resource "aws_instance" "diy_nat_gw" {
  # checkov:skip=CKV_AWS_88,CKV_AWS_126 : Pull logs with another tool
  ami                         = data.aws_ami.al2023_arm64.id
  instance_type               = "t4g.nano"
  vpc_security_group_ids      = [aws_security_group.diy_nat_sg.id]
  subnet_id                   = aws_subnet.public_subnet_1.id # hardcode one of the public subnets
  iam_instance_profile        = aws_iam_instance_profile.nat_profile.name
  associate_public_ip_address = true
  source_dest_check           = false
  ebs_optimized               = true

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "persistent"
      instance_interruption_behavior = "stop"
    }
  }

  root_block_device {
    encrypted = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "diy-nat-gw"
  }

  user_data = <<-EOF
    MIME-Version: 1.0
    Content-Type: multipart/mixed; boundary="==BOUNDARY=="

    --==BOUNDARY==
    Content-Type: text/cloud-config; charset="us-ascii"

    #cloud-config
    cloud_final_modules:
    - [scripts-user, always]

    --==BOUNDARY==
    Content-Type: text/x-shellscript; charset="us-ascii"

    #!/bin/bash
    METADATA_IP="169.254.169.254"
    TOKEN=$(curl -s -X PUT "http://$METADATA_IP/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

    INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://$METADATA_IP/latest/meta-data/instance-id)
    REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://$METADATA_IP/latest/meta-data/placement/region)

    aws ec2 modify-instance-attribute --region $REGION --instance-id $INSTANCE_ID --no-source-dest-check

    ROUTE_TABLES="${aws_route_table.private_1.id} ${aws_route_table.private_2.id}"

    for RTB_ID in $ROUTE_TABLES; do
      aws ec2 replace-route --region $REGION --route-table-id $RTB_ID --destination-cidr-block 0.0.0.0/0 --instance-id $INSTANCE_ID
      if [ $? -ne 0 ]; then
        aws ec2 create-route --region $REGION --route-table-id $RTB_ID --destination-cidr-block 0.0.0.0/0 --instance-id $INSTANCE_ID
      fi
    done

    sysctl -w net.ipv4.ip_forward=1
    grep -qxF "net.ipv4.ip_forward=1" /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

    dnf install -y iptables-services
    
    systemctl enable --now iptables

    PRIMARY_IFACE=$(ip route show default | awk '{print $5}')

    iptables -F
    iptables -t nat -F
    iptables -t nat -A POSTROUTING -o $PRIMARY_IFACE -j MASQUERADE

    service iptables save
    --==BOUNDARY==--
  EOF
}

resource "aws_iam_role" "nat_route_role" {
  name = "diy-nat-route-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "nat_route_policy" {
  name = "diy-nat-route-policy"
  role = aws_iam_role.nat_route_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:ReplaceRoute", "ec2:CreateRoute"]
        Resource = "arn:aws:ec2:${var.region}:${local.env_vars[var.environment].project_id}:route-table/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:ModifyInstanceAttribute"]
        Resource = "arn:aws:ec2:${var.region}:${local.env_vars[var.environment].project_id}:instance/*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "diy_nat_ssm_attachment" {
  role       = aws_iam_role.nat_route_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_security_group" "diy_nat_sg" {
  # checkov:skip=CKV_AWS_382
  name_prefix = "diy-nat-sg-"
  vpc_id      = aws_vpc.vpc_network.id
  description = "Outbound internet access for vpc instances"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "diy-nat-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "nat_vpc_inbound" {
  description       = "Allow all vpc traffic inbound"
  security_group_id = aws_security_group.diy_nat_sg.id
  cidr_ipv4         = aws_vpc.vpc_network.cidr_block
  from_port         = 0
  ip_protocol       = "-1"
  to_port           = 0
}

resource "aws_vpc_security_group_egress_rule" "nat_all_outbound" {
  description       = "Allow all outbound"
  security_group_id = aws_security_group.diy_nat_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 0
  ip_protocol       = "-1"
  to_port           = 0
}
