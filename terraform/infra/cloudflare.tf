resource "aws_secretsmanager_secret" "cloudflare_token" {
  name       = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-cloudflare-token"
  kms_key_id = aws_kms_key.key.id
}

data "cloudflare_ip_ranges" "ip_ranges" {
  networks = "networks"
}

resource "cloudflare_dns_record" "cname_root" {
  zone_id = local.env_vars[var.environment].zone_id
  name    = "@"
  ttl     = 1
  type    = "CNAME"
  content = aws_lb.front_end.dns_name
  proxied = true
}

resource "cloudflare_dns_record" "cname_wildcard" {
  zone_id = local.env_vars[var.environment].zone_id
  name    = "*"
  ttl     = 1
  type    = "CNAME"
  content = aws_lb.front_end.dns_name
  proxied = true
}

resource "aws_vpc_security_group_ingress_rule" "lb_cloudflare_ips" {
  for_each          = toset(data.cloudflare_ip_ranges.ip_ranges.ipv4_cidrs)
  security_group_id = aws_security_group.fe_lb.id
  description       = "Allow https inbound from cloudflare"
  cidr_ipv4         = each.value
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "lb_https" {
  security_group_id = aws_security_group.fe_lb.id
  description       = "Allow https inbound from my ip"
  cidr_ipv4         = "159.196.168.43/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}
