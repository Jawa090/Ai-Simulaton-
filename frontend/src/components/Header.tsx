import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSimulationSocket } from "../ws/SimulationSocketContext";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/units", label: "Units" },
  { to: "/antennas", label: "Antenna View" },
  { to: "/alerts", label: "Alert Center" },
  { to: "/config", label: "Configuration" },
  { to: "/presentation", label: "Presentation Mode" },
];

export function Header() {
  const { user, logout } = useAuth();
  const { connected } = useSimulationSocket();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
      }}
    >
      <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: 15 }}>
        EIGHTH <span style={{ color: "var(--accent)" }}>AVITRONICS</span>
      </div>
      <span className="simulation-label">SIMULATION MODE</span>
      <nav style={{ display: "flex", gap: 4, flex: 1 }}>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            style={({ isActive }) => ({
              padding: "5px 10px",
              borderRadius: 3,
              fontSize: 12,
              color: isActive ? "var(--accent)" : "var(--text-1)",
              background: isActive ? "var(--bg-3)" : "transparent",
              textDecoration: "none",
            })}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "var(--text-2)" }}>
        <span className={`badge ${connected ? "status-ACTIVE" : "status-OFFLINE"}`}>
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
        <span className="mono">SIM TIME {clock.toLocaleTimeString()}</span>
        {user && (
          <>
            <span>
              {user.displayName} <span className="badge status-DETECTED">{user.role}</span>
            </span>
            <button onClick={logout}>Log out</button>
          </>
        )}
      </div>
    </header>
  );
}
