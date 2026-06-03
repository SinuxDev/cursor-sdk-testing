# Check for Node.js, npm, yarn, and Docker. Outputs missing tools for dev-env-install skill.

$missing = @()

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $missing += "node"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  $missing += "npm"
}

if (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
  $missing += "yarn"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  $missing += "docker"
}

if ($missing.Count -eq 0) {
  Write-Host "OK: node, npm, yarn, and docker are installed."
  exit 0
}

Write-Host "MISSING: $($missing -join ' ')"
exit 1
