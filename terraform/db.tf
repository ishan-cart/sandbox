resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = local.env_vars[var.environment].tf_state_lock_table
  billing_mode   = "PROVISIONED"
  hash_key       = "LockID"
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "LockID"
    type = "S"
  }
}
