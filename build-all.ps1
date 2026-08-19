# build-all.ps1 - Package all browser extensions
$extensions = @("translate", "movieplay", "wlman")

foreach ($ext in $extensions) {
    Write-Host "`nBuilding $ext extension..." -ForegroundColor Cyan
    Push-Location "extensions\$ext"
    try {
        & .\build.ps1
    } finally {
        Pop-Location
    }
}

Write-Host "`nAll extensions built successfully!" -ForegroundColor Green
