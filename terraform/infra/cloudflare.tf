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

resource "cloudflare_dns_record" "cname_www" {
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

resource "cloudflare_page_rule" "redirect_www" {
  zone_id = local.env_vars[var.environment].zone_id
  target = "www.${local.env_vars[var.environment].zone_id}"
  priority = 1
  status = "active"
  actions = {
    forwarding_url = {
      url = "https://${local.env_vars[var.environment].zone_id}"
      status_code = 301
    }
  }
}

resource "cloudflare_bot_management" "example_bot_management" {
  zone_id = "023e105f4ecef8ad9ca31a8372d0c353"
  auto_update_model = true
  ai_bots_protection = "block"
  cf_robots_variant = "policy_only"
  content_bots_protection = "disabled"
  crawler_protection = "enabled"
  enable_js = true
  fight_mode = false
  is_robots_txt_managed = true
}