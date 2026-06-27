$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path "$scriptDir\.."
$keystorePath = "$projectRoot\android\gridrunner.keystore"
$unsignedApk = "$projectRoot\android\app\build\outputs\apk\release\app-release-unsigned.apk"
$signedApk = "$projectRoot\android\app\build\outputs\apk\release\app-release-signed.apk"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$outputApk = "$desktopPath\GridRunner-signed.apk"

if (-not (Test-Path $keystorePath)) {
    Write-Host "Keystore not found. Generating..." -ForegroundColor Yellow
    keytool -genkey -v -keystore $keystorePath -alias gridrunner -keyalg RSA -keysize 2048 -validity 10000 -storepass gridrunner -keypass gridrunner -dname "CN=GridRunner, OU=Dev, O=GridRunner, L=Moscow, ST=Russia, C=RU"
    Write-Host "Keystore created at $keystorePath" -ForegroundColor Green
}

if (-not (Test-Path $unsignedApk)) {
    Write-Host "Building release APK..." -ForegroundColor Yellow
    Push-Location "$projectRoot\android"
    try {
        .\gradlew assembleRelease
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Gradle build failed!" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $unsignedApk)) {
    Write-Host "Unsigned APK not found at $unsignedApk" -ForegroundColor Red
    exit 1
}

Write-Host "Signing APK..." -ForegroundColor Yellow
apksigner sign --ks $keystorePath --ks-key-alias gridrunner --ks-pass pass:gridrunner --key-pass pass:gridrunner --out $signedApk $unsignedApk

if ($LASTEXITCODE -ne 0) {
    Write-Host "Signing failed!" -ForegroundColor Red
    exit 1
}

Copy-Item $signedApk $outputApk -Force

Write-Host "GridRunner-signed.apk has been copied to your Desktop!" -ForegroundColor Green
Write-Host ""
Write-Host "Installing on device/emulator:" -ForegroundColor Cyan
Write-Host "  adb install $outputApk" -ForegroundColor White
Write-Host ""
Write-Host "Verifying signature:" -ForegroundColor Cyan
Write-Host "  apksigner verify --verbose $outputApk" -ForegroundColor White
