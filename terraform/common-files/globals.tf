locals {
  env_vars = {
    "development" = {
      env_short           = "dev"
      project             = "yeahboi"
      project_id          = 537239034666
      tf_state_bucket     = "yeahboi-dev-state"
      tf_state_lock_table = "yeahboi-dev-state-lock"
      eks_cluster_name    = "yeahboi-dev-cluster"
      domain_name         = "ishans.au"
    }
  }
}
