resource "aws_lb" "front_end" {
  # checkov:skip=CKV2_AWS_28
  name                       = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-lb"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.fe_lb.id]
  subnets                    = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
  drop_invalid_header_fields = true
  enable_deletion_protection = true

  access_logs {
    enabled = true
    bucket  = aws_s3_bucket.access_logs.bucket
  }
}

resource "aws_lb_target_group" "eks_haproxy_backend_https" {
  name            = "eks-haproxy-backend-https"
  port            = 8443
  protocol        = "HTTPS"
  target_type     = "ip"
  vpc_id          = aws_vpc.vpc_network.id
  ip_address_type = "ipv4"

  health_check {
    enabled = true
    path    = "/healthz"
    port    = 1042
  }
}

resource "aws_lb_listener" "front_end_https" {
  load_balancer_arn = aws_lb.front_end.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.domain_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.eks_haproxy_backend_https.arn
  }

  depends_on = [aws_acm_certificate_validation.cert_waiter]
}
