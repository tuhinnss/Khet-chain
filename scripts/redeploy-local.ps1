# Redeploy contract to running Hardhat node and update .env files
$root = Split-Path $PSScriptRoot -Parent
Set-Location "$root\contracts"

$output = npm run deploy:local 2>&1 | Out-String
Write-Host $output

if ($output -match "deployed to: (0x[a-fA-F0-9]+)") {
    $addr = $Matches[1]
    Write-Host "Contract: $addr" -ForegroundColor Green

    @(
        "$root\.env",
        "$root\frontend\.env"
    ) | ForEach-Object {
        if (Test-Path $_) {
            (Get-Content $_) -replace 'KHETCHAIN_CONTRACT_ADDRESS=.*', "KHETCHAIN_CONTRACT_ADDRESS=$addr" `
                              -replace 'VITE_CONTRACT_ADDRESS=.*', "VITE_CONTRACT_ADDRESS=$addr" |
                Set-Content $_
        }
    }
    Write-Host "Updated .env and frontend/.env" -ForegroundColor Green

    $env:KHETCHAIN_CONTRACT_ADDRESS = $addr
    npm run grant-roles:local 2>&1 | Write-Host
    Write-Host "Granted test roles to Hardhat accounts #1–#3" -ForegroundColor Green
    Write-Host "Restart backend and frontend, clear browser cache, then log in again." -ForegroundColor Yellow
}
