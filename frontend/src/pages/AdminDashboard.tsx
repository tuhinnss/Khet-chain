import { useEffect, useState } from "react";
import { approveUser, listUsers, ManagedUser, rejectUser } from "../api/admin.api";
import { ApprovalStatus } from "../types";
import { ROLE_LABELS } from "../utils/constants";
import { getErrorMessage } from "../utils/errors";

const TABS: { status: ApprovalStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export default function AdminDashboard() {
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load(status);
  }, [status]);

  async function load(s: ApprovalStatus) {
    try {
      setUsers(await listUsers(s));
    } catch (err) {
      setMsg({ text: getErrorMessage(err, "Could not load users"), ok: false });
    }
  }

  async function decide(user: ManagedUser, action: "approve" | "reject") {
    setBusyId(user.id);
    setMsg(null);
    try {
      // The server grants/revokes the on-chain role before saving the decision.
      await (action === "approve" ? approveUser(user.id) : rejectUser(user.id));
      setMsg({
        text:
          action === "approve"
            ? `Approved ${user.name}; ${user.role} role granted on-chain.`
            : `Rejected ${user.name}; any on-chain role was revoked.`,
        ok: true,
      });
      await load(status);
    } catch (err) {
      setMsg({ text: getErrorMessage(err, `Could not ${action} ${user.name}`), ok: false });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="badge-role">ADMIN</span>
          <h1>Account Approvals</h1>
          <p className="subtitle">
            New accounts get no on-chain role until approved here. Rejecting an approved account revokes its role.
          </p>
        </div>
      </header>

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}

      <section className="card">
        <div className="inline-form" style={{ marginBottom: "1rem" }}>
          {TABS.map((t) => (
            <button
              key={t.status}
              type="button"
              className={t.status === status ? "btn-primary-sm" : "btn-secondary-sm"}
              onClick={() => setStatus(t.status)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {users.length === 0 ? (
          <p className="muted">No {status} accounts.</p>
        ) : (
          <div className="batch-grid">
            {users.map((u) => (
              <div key={u.id} className="batch-card">
                <div className="batch-card-header">
                  <h3>{u.name}</h3>
                  <span className="badge-role">{ROLE_LABELS[u.role] ?? u.role}</span>
                </div>
                <p>{u.email}</p>
                {u.businessName && <p>{u.businessName}</p>}
                <p>
                  Wallet: <code>{u.walletAddress}</code>
                </p>
                {u.createdAt && <p className="muted">Registered {new Date(u.createdAt).toLocaleString()}</p>}
                <div className="batch-card-actions">
                  {status !== "approved" && (
                    <button
                      type="button"
                      className="btn-primary-sm"
                      disabled={busyId === u.id}
                      onClick={() => decide(u, "approve")}
                    >
                      Approve
                    </button>
                  )}
                  {status !== "rejected" && (
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      disabled={busyId === u.id}
                      onClick={() => decide(u, "reject")}
                    >
                      {status === "approved" ? "Revoke" : "Reject"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
