# KhetChain — start all services (run from repo root)
# Opens 3 new PowerShell windows for Hardhat, Backend, Frontend

$root = Split-Path $PSScriptRoot -Parent

Write-Host "KhetChain startup" -ForegroundColor Green
Write-Host "Repo: $root"

# Deploy contract if Hardhat will be fresh (optional — run manually if chain was reset)
Write-Host "`nIf Hardhat node was restarted, redeploy first:" -ForegroundColor Yellow
Write-Host "  cd contracts; npm run deploy:local" -ForegroundColor Gray
Write-Host "  Then update .env and frontend/.env with the new contract address`n"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\contracts'; Write-Host 'Hardhat Node' -ForegroundColor Cyan; npx hardhat node"
Start-Sleep -Seconds 4

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; Write-Host 'Backend API :4000' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; Write-Host 'Frontend :5173' -ForegroundColor Cyan; npm run dev"

Write-Host "Started 3 terminals:" -ForegroundColor Green
Write-Host "  1. Hardhat node  -> http://127.0.0.1:8545"
Write-Host "  2. Backend API   -> http://localhost:4000"
Write-Host "  3. Frontend      -> http://localhost:5173"
Write-Host "`nOpen http://localhost:5173 in your browser" -ForegroundColor Cyan
