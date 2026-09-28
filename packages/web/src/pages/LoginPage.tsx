import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@avitronics.sim");
  const [password, setPassword] = useState("operator123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)" }}>
      <form onSubmit={onSubmit} className="panel" style={{ width: 340, padding: 24, gap: 14 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.05em" }}>
            EIGHTH <span style={{ color: "var(--accent)" }}>AVITRONICS</span>
          </div>
          <div className="simulation-label" style={{ marginTop: 8, display: "inline-block" }}>
            SIMULATION / NOT TO SCALE
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-2)" }}>
          EMAIL
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-2)", marginTop: 10 }}>
          PASSWORD
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>{error}</div>}
        <button className="primary" type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div className="notice" style={{ marginTop: 14 }}>
          Demo accounts: admin@avitronics.sim / operator@avitronics.sim / viewer@avitronics.sim (see README)
        </div>
      </form>
    </div>
  );
}
