resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-state-lock"
  billing_mode   = "PROVISIONED"
  hash_key       = "LockID"
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "LockID"
    type = "S"
  }
}
