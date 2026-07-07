# tflint-ignore-file: terraform_unused_declarations
locals {
  github_user = "ishan-cart"
  repository  = "sandbox"
  env_vars = {
    "development" = {
      env_short        = "dev"
      project          = "yeahboi"
      project_id       = 537239034666
      eks_cluster_name = "yeahboi-dev-cluster"
      domain_name      = "ishans.au"
      zone_id          = "8faa4ea9e5d22c52c4398a3145daef4e"
      vpc_cidr         = "10.0.0.0/16"
      az_allocation = {
        "ap-southeast-2a" = {
          public  = { newbits = 8, netnum = 1 },
          private = { newbits = 8, netnum = 31 },
        },
        "ap-southeast-2b" = {
          public  = { newbits = 8, netnum = 2 },
          private = { newbits = 8, netnum = 36 },
        }
      }
    }
  }

  subnet_map = {
    for az, allocation in local.env_vars[var.environment].az_allocation : az => {
      public  = cidrsubnet(local.env_vars[var.environment].vpc_cidr, allocation.public.newbits, allocation.public.netnum)
      private = cidrsubnet(local.env_vars[var.environment].vpc_cidr, allocation.private.newbits, allocation.private.netnum)
    }
  }
}