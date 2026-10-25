# KhetChain local setup — run from repo root
# Prereqs: MongoDB running on localhost:27017, Node.js installed

Write-Host "Starting Hardhat node (new window recommended)..." -ForegroundColor Cyan
Write-Host "  cd contracts; npx hardhat node" -ForegroundColor Gray

# Public Hardhat test keys. Account #0 deploys (full admin) and is the app's admin
# wallet; account #9 is the backend relayer and only gets REGISTRAR_ROLE.
$adminWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
$relayerKey = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
$env:RELAYER_PRIVATE_KEY = $relayerKey  # read by deploy.ts to grant REGISTRAR_ROLE

Set-Location "$PSScriptRoot\..\contracts"
$deploy = npm run deploy:local 2>&1 | Out-String
Write-Host $deploy

if ($deploy -match "deployed to: (0x[a-fA-F0-9]+)") {
    $addr = $Matches[1]
    Write-Host "Contract: $addr" -ForegroundColor Green

    $envContent = @"
JWT_SECRET=khetchain-dev-secret-change-me
PORT=4000
MONGODB_URI=mongodb://localhost:27017/khetchain
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
KHETCHAIN_CONTRACT_ADDRESS=$addr
RELAYER_PRIVATE_KEY=$relayerKey
ADMIN_WALLETS=$adminWallet
FRONTEND_URL=http://localhost:5173
"@
    Set-Content "$PSScriptRoot\..\.env" $envContent

    $feContent = @"
VITE_API_URL=http://localhost:4000/api/v1
VITE_CONTRACT_ADDRESS=$addr
VITE_CHAIN_ID=31337
"@
    Set-Content "$PSScriptRoot\..\frontend\.env" $feContent
    Write-Host "Wrote .env and frontend/.env" -ForegroundColor Green
}

Write-Host "`nStart services:" -ForegroundColor Cyan
Write-Host "  npm run dev:backend   (terminal 2)"
Write-Host "  npm run dev:frontend  (terminal 3)"
Write-Host "  Open http://localhost:5173"
Write-Host "`nAdmin: import Hardhat account #0 into MetaMask and register as Admin to approve new users." -ForegroundColor Cyan
