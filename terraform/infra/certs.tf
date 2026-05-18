resource "aws_acm_certificate" "domain_cert" {
  domain_name       = local.env_vars[var.environment].domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cert_waiter" {
  certificate_arn = aws_acm_certificate.domain_cert.arn
}

resource "aws_acm_certificate" "wildcard_subdomain_cert" {
  domain_name       = "*.${local.env_vars[var.environment].domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "wildcard_cert_waiter" {
  certificate_arn = aws_acm_certificate.wildcard_subdomain_cert.arn
}

resource "aws_lb_listener_certificate" "wildcard_cert_attachment" {
  listener_arn    = aws_lb_listener.front_end_https.arn
  certificate_arn = aws_acm_certificate.wildcard_subdomain_cert.arn
}