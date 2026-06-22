# Shared .tf files are symlinked into infra/kubernetes/web-app modules.
# common-files is not a standalone module; disable all rules here.
config {
  disabled_by_default = true
}
