import { useEffect, useState } from "react";
import { connectWallet, getConnectedNetwork, ensurePolygonAmoyNetwork } from "../../hooks/useWallet";
import { CHAIN_ID } from "../../utils/constants";

export default function WalletButton() {
  const [account, setAccount] = useState<string>("");
  const [network, setNetwork] = useState<{ chainId: number; name: string }>({ chainId: 0, name: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: unknown) => {
        const accs = accounts as string[];
        setAccount(accs && accs.length > 0 ? accs[0] : "");
      });
      window.ethereum.on("chainChanged", () => {
        checkConnection();
      });
    }
  }, []);

  async function checkConnection() {
    if (!window.ethereum) return;
    try {
      const net = await getConnectedNetwork();
      setNetwork(net);
      if (window.ethereum.request) {
        const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    } catch {
      // Ignore initial silent errors
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      const addr = await connectWallet();
      setAccount(addr);
      const net = await getConnectedNetwork();
      setNetwork(net);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to connect MetaMask");
    } finally {
      setLoading(false);
    }
  }

  const isWrongNetwork = account && network.chainId !== 0 && network.chainId !== CHAIN_ID && network.chainId !== 80002;

  return (
    <div className="wallet-button-wrapper">
      {isWrongNetwork && (
        <button
          type="button"
          onClick={ensurePolygonAmoyNetwork}
          className="btn-warning-sm"
          title="Switch to Polygon Amoy Testnet"
        >
          ⚠️ Switch to Amoy
        </button>
      )}

      {account ? (
        <div className="wallet-connected-pill">
          <span className="network-indicator" title={network.name || "Polygon Amoy"}>
            ● {network.chainId === 80002 || network.chainId === CHAIN_ID ? "Amoy" : "Network"}
          </span>
          <span className="wallet-addr-text">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="btn-wallet-connect"
        >
          {loading ? "Connecting..." : "🦊 Connect MetaMask"}
        </button>
      )}
    </div>
  );
}
