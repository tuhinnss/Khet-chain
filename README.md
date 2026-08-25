# KhetChain

Decentralized Agricultural Supply Chain & Marketplace — farmers register produce on-chain, dealers bid with ETH escrow, retailers verify provenance, and consumers scan QR codes without logging in.
Check the ppt file for the proposed solution.
## Stack

- **Contracts:** Solidity 0.8, Hardhat, OpenZeppelin AccessControl
- **Backend:** Node.js, Express, MongoDB, Ethers.js, JWT + MetaMask signatures
- **Frontend:** React (Vite), Ethers.js, html5-qrcode

## Quick Start (Local)

### 1. MongoDB

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Compile & test contracts

```bash
npm run compile
npm run test:contracts
```

### 4. Start local Hardhat node (terminal 1)

```bash
npm run node
```

### 5. Deploy contract (terminal 2)

```bash
npm run deploy:local
```

Copy the deployed address into `.env` and `frontend/.env`:

```
KHETCHAIN_CONTRACT_ADDRESS=0x...
RELAYER_PRIVATE_KEY=<hardhat account #0 private key>
VITE_CONTRACT_ADDRESS=0x...
```

### 6. Grant roles to test accounts (optional)

```bash
cd contracts
KHETCHAIN_CONTRACT_ADDRESS=0x... npm run grant-roles:local
```

The backend also grants on-chain roles automatically when users register (via relayer wallet).

### 7. Start backend (terminal 3)

```bash
npm run dev:backend
```

### 8. Start frontend (terminal 4)

```bash
npm run dev:frontend
```

Open http://localhost:5173

## Sepolia Deployment

1. Set `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `.env`
2. `cd contracts && npm run deploy:sepolia`
3. Update `RPC_URL`, `CHAIN_ID=11155111`, and contract address in backend/frontend env files

## Workflow

1. **Farmer** registers with MetaMask → registers produce batch on-chain → creates listing
2. **Dealer** browses marketplace → places ETH bid (held in contract escrow)
3. **Farmer** accepts winning bid → ownership transfers to dealer
4. **Dealer** updates status (In Transit → Delivered)
5. **Retailer** scans QR, verifies provenance, transfers ownership, marks Retail Ready
6. **Consumer** scans QR at `/verify/:batchId` — no login required

## API (prefix `/api/v1`)

| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/nonce` | Public |
| POST | `/auth/register` | Public + MetaMask sig |
| POST | `/auth/login` | Public + MetaMask sig |
| POST | `/batch` | Farmer (sync after on-chain tx) |
| GET | `/batch` | Authenticated |
| GET | `/batch/:id` | Public |
| GET | `/batch/:id/verify` | Public |
| POST | `/listing` | Farmer |
| GET | `/listing` | Public |
| POST | `/bid` | Dealer |
| POST | `/bid/accept` | Farmer |
| POST | `/transfer` | Dealer / Retailer |
| POST | `/status` | Dealer / Retailer |
| GET | `/history/:id` | Public |
| GET | `/dashboard/stats` | Authenticated |

## Architecture

All write operations are signed by the user's MetaMask wallet. The backend indexes transactions by `txHash`, listens for contract events, and stores a MongoDB search/cache layer. The blockchain is the source of truth for supply chain state.
