locals {
  env_vars = {
    "development" = {
      env_short           = "dev"
      project             = "yeahboi"
      project_id          = "some id"
      tf_state_bucket     = "yeahboi-dev-state"
      tf_state_lock_table = "yeahboi-dev-state-lock"
    }
  }
}