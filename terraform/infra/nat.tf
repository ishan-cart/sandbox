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
  name_prefix = "diy-nat-instance-profile"
  role        = aws_iam_role.nat_route_role.name
}

locals {
  route_tables_string = join(" ", [for rt in aws_route_table.private_tables : rt.id])
}

resource "aws_launch_template" "diy_nat" {
  # checkov:skip=CKV_AWS_88
  name_prefix = "diy-nat-gw-template"
  description = "Launch template for highly available DIY NAT Gateway"

  image_id      = data.aws_ami.al2023_arm64.id
  instance_type = "t4g.nano"

  placement {
    group_name = aws_placement_group.diy_nat.name
  }

  iam_instance_profile {
    arn = aws_iam_instance_profile.nat_profile.arn
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.diy_nat_sg.id]
    interface_type              = "interface"
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  block_device_mappings {
    device_name = "/dev/xvda" # Default root drive for Amazon Linux
    ebs {
      encrypted = true
    }
  }

  # IMDSv2 configuration
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  # User data needs to be base64 encoded for launch templates
  user_data = base64encode(<<-EOF
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

    ROUTE_TABLES="${local.route_tables_string}"

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
  )

  # Tags applied directly to the template resource itself
  tags = {
    Name = "diy-nat-gw-template"
  }

  # Standard template tag specs to tag actual EC2 instances at launch
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "diy-nat-gw"
    }
  }
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
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_egress_rule" "nat_all_outbound" {
  description       = "Allow all outbound"
  security_group_id = aws_security_group.diy_nat_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_placement_group" "diy_nat" {
  name     = "diy-nat-pg"
  strategy = "spread"
}


resource "aws_autoscaling_group" "diy_nat" {
  name_prefix         = "diy-nat-asg"
  max_size            = 1
  min_size            = 1
  health_check_type   = "EC2"
  desired_capacity    = 1
  force_delete        = false
  vpc_zone_identifier = [for subnet in aws_subnet.public_subnets : subnet.id]

  launch_template {
    id      = aws_launch_template.diy_nat.id
    version = "$Latest"
  }

  instance_maintenance_policy {
    min_healthy_percentage = 90
    max_healthy_percentage = 120
  }

  initial_lifecycle_hook {
    name                 = "launch-hook"
    default_result       = "CONTINUE"
    heartbeat_timeout    = 300
    lifecycle_transition = "autoscaling:EC2_INSTANCE_LAUNCHING"
  }

  tag {
    key                 = "environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
