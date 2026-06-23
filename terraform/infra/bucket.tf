resource "aws_s3_bucket" "terraform_state" {
  # checkov:skip=CKV2_AWS_61
  bucket = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-state"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "terraform_state" {
  bucket        = aws_s3_bucket.terraform_state.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "AWSLogs/"
}

resource "aws_s3_bucket" "access_logs" {
  # checkov:skip=CKV_AWS_21
  bucket = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-access-logs"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  # checkov:skip=CKV_AWS_18
  bucket = aws_s3_bucket.access_logs.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "AWSLogDeliveryWrite",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : ["logdelivery.elasticloadbalancing.amazonaws.com", "delivery.logs.amazonaws.com"]
        },
        "Action" : "s3:PutObject",
        "Resource" : "arn:aws:s3:::${aws_s3_bucket.access_logs.bucket}/AWSLogs/${local.env_vars[var.environment].project_id}/*",
      },
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.bucket

  rule {
    id     = "DeleteOldItems30Days"
    status = "Enabled"
    filter {}
    expiration {
      days = 30
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}


resource "aws_s3_bucket" "loki_logs" {
  # checkov:skip=CKV_AWS_18,CKV_AWS_21
  bucket = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-loki"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "loki_logs" {
  bucket = aws_s3_bucket.loki_logs.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
  
}

resource "aws_s3_bucket_public_access_block" "loki_logs" {
  bucket = aws_s3_bucket.loki_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "loki_logs" {
  bucket = aws_s3_bucket.loki_logs.bucket

  rule {
    id     = "DeleteOldItems30Days"
    status = "Enabled"
    filter {}
    expiration {
      days = 30
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}