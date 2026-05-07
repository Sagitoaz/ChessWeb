param(
  [ValidateSet("dev", "staging", "prod")]
  [string]$Environment = "dev",

  [switch]$AllowProdReset
)

$ErrorActionPreference = "Stop"

$dbName = switch ($Environment) {
  "dev" { "chessweb_dev" }
  "staging" { "chessweb_staging" }
  "prod" { "chessweb_prod" }
}

if (-not $env:MONGODB_URI) {
  throw "MONGODB_URI is not set. Set it in the current PowerShell session before running this script."
}

if ($Environment -eq "prod" -and -not $AllowProdReset) {
  throw "Refusing to reset prod without -AllowProdReset."
}

$env:MONGODB_DB_NAME = $dbName
$env:ALLOW_DB_RESET = "true"
if ($AllowProdReset) {
  $env:ALLOW_PROD_DB_RESET = "true"
}

Write-Host "[v2-reset] Environment: $Environment"
Write-Host "[v2-reset] Database: $dbName"
Write-Host "[v2-reset] Running destructive reset + setup..."

mongosh "$env:MONGODB_URI" --file "backend/mongodb/setup/v2/99_full_reset_setup_v2.mongosh.js"

Write-Host "[ok] MongoDB v2 reset + setup finished for $dbName"
