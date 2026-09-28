import { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UnitsListPage } from "./pages/UnitsListPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";
import { AntennaViewPage } from "./pages/AntennaViewPage";
import { TrackDetailPage } from "./pages/TrackDetailPage";
import { AlertCenterPage } from "./pages/AlertCenterPage";
import { ConfigurationPage } from "./pages/ConfigurationPage";
import { PresentationPage } from "./pages/PresentationPage";

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24, color: "var(--text-1)" }}>Loading EIGHTH AVITRONICS...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/units" element={<UnitsListPage />} />
        <Route path="/units/:id" element={<UnitDetailPage />} />
        <Route path="/antennas" element={<AntennaViewPage />} />
        <Route path="/tracks/:id" element={<TrackDetailPage />} />
        <Route path="/alerts" element={<AlertCenterPage />} />
        <Route path="/config" element={<ConfigurationPage />} />
        <Route path="/presentation" element={<PresentationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
