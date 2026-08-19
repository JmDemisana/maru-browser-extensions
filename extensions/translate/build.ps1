# build.ps1 - Package Messenger Translate for Chrome and Firefox
$name = "messenger-translate"
$manifest = Get-Content manifest.json | ConvertFrom-Json
$version = $manifest.version
$outDir = "dist"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$include = @(
    "manifest.json",
    "api.js",
    "content.js",
    "popup.html",
    "popup.js",
    "icons\icon16.png",
    "icons\icon48.png",
    "icons\icon128.png"
)

$chromeZip = "$outDir\$name-chrome-$version.zip"
$firefoxXpi = "$outDir\$name-firefox-$version.xpi"

if (Test-Path $chromeZip) { Remove-Item $chromeZip -Force }
if (Test-Path $firefoxXpi) { Remove-Item $firefoxXpi -Force }

Compress-Archive -Path $include -DestinationPath $chromeZip -Force
Copy-Item -Path $chromeZip -Destination $firefoxXpi -Force

Write-Host "Built Chrome: $chromeZip"
Write-Host "Built Firefox: $firefoxXpi"
