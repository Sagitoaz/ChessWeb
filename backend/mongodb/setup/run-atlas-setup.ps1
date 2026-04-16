param(
  [ValidateSet("dev", "staging", "prod")]
  [string]$Environment = "dev",

  [ValidateSet("full", "collections", "indexes", "seed")]
  [string]$Step = "full",

  [string]$MongoUri
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent (Split-Path -Parent $scriptDir)
$envFile = Join-Path $backendDir ".env"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) { return }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($key) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

switch ($Environment) {
  "dev" { $env:MONGODB_DB_NAME = "chessweb_dev" }
  "staging" { $env:MONGODB_DB_NAME = "chessweb_staging" }
  "prod" { $env:MONGODB_DB_NAME = "chessweb_prod" }
}

if ($MongoUri) {
  $env:MONGODB_URI = $MongoUri
}

if (-not $env:MONGODB_URI) {
  throw "Missing MONGODB_URI. Add it to backend/.env or pass -MongoUri."
}

$scriptPath = switch ($Step) {
  "full" { Join-Path $scriptDir "99_full_setup.mongosh.js" }
  "collections" { Join-Path $scriptDir "00_create_collections.mongosh.js" }
  "indexes" { Join-Path $scriptDir "01_create_indexes.mongosh.js" }
  "seed" { Join-Path $scriptDir "02_seed_reference.mongosh.js" }
}

Write-Host "[atlas-setup] Environment: $Environment"
Write-Host "[atlas-setup] Step: $Step"
Write-Host "[atlas-setup] Database: $($env:MONGODB_DB_NAME)"
Write-Host "[atlas-setup] Script: $scriptPath"

& mongosh $env:MONGODB_URI --file $scriptPath
