import { useState } from "react";
import { acceptBid, getBids } from "../api/bid.api";
import { getContract } from "../hooks/useWallet";

export default function BidManagement() {
  const [batchId, setBatchId] = useState("");
  const [bids, setBids] = useState<{ onChainBids: { index: number; dealer: string; amount: string; active: boolean }[] } | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await getBids(Number(batchId));
    setBids(data);
  }

  async function accept(index: number) {
    const id = Number(batchId);
    try {
      const contract = await getContract();
      const tx = await contract.acceptBid(id, index);
      const receipt = await tx.wait();
      await acceptBid({ batchId: id, bidIndex: index, txHash: receipt.hash });
      setMsg(`Accepted bid #${index}`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="page">
      <h1>Bid Management</h1>
      <div className="inline-form">
        <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
        <button onClick={load} className="btn-secondary">Load Bids</button>
      </div>
      {msg && <div className="alert">{msg}</div>}
      {bids?.onChainBids?.map((b) => (
        <div key={b.index} className="bid-item card">
          <span>#{b.index} — {b.dealer.slice(0, 10)}… — {(Number(b.amount) / 1e18).toFixed(4)} ETH {b.active ? "(active)" : ""}</span>
          {b.active && <button onClick={() => accept(b.index)} className="btn-primary-sm">Accept</button>}
        </div>
      ))}
    </div>
  );
}
