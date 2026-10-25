import { useState } from "react";
import { getContract, ensureSepoliaNetwork } from "../../hooks/useWallet";
import { getErrorMessage } from "../../utils/errors";
import TransactionBadge from "../common/TransactionBadge";

/**
 * Bids are escrowed on-chain. Losing bids are not pushed back automatically
 * (that let one bidder block a sale), so bidders reclaim them here. Also
 * cancels a bid that hasn't been accepted yet.
 */
export default function ReclaimBidCard() {
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  async function reclaim() {
    const id = Number(batchId);
    if (!id) return;
    setLoading(true);
    setMsg("");
    setTxHash("");
    try {
      await ensureSepoliaNetwork();
      const contract = await getContract();
      const tx = await contract.withdrawBid(id);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setMsg(`Escrowed bid on batch #${id} returned to your wallet.`);
    } catch (err) {
      const text = getErrorMessage(err, "Reclaim failed");
      setMsg(
        text.includes("Bid inactive") || text.includes("No bid")
          ? `No reclaimable bid on batch #${id} — it was accepted, already reclaimed, or never placed.`
          : text
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Reclaim an Escrowed Bid</h2>
      <p className="muted">
        Lost an auction or changed your mind? Withdraw your active bid's escrow for a batch.
      </p>
      <div className="inline-form">
        <input
          type="number"
          placeholder="Batch ID"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        />
        <button type="button" onClick={reclaim} className="btn-secondary" disabled={loading || !batchId}>
          {loading ? "Reclaiming..." : "Reclaim Bid"}
        </button>
      </div>
      {msg && <p>{msg}</p>}
      <TransactionBadge txHash={txHash} label="Tx Hash" />
    </section>
  );
}
