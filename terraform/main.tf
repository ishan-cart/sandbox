terraform {
    backend "gcs" { 
      bucket  = "terraform-state-is-cicdproject"
      prefix  = "prod"
    }
}

provider "google" {
  project = var.project
  region = var.region
}