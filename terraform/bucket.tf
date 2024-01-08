resource "google_storage_bucket" "static-site" {
  name          = "${var.data-project}-raw"
  location      = "US"
  force_destroy = true

  uniform_bucket_level_access = true
}