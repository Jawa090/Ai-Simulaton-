import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { UnitSummary } from "../api/types";
import { UnitStatusPanel } from "../components/UnitStatusPanel";

export function UnitsListPage() {
  const { data: units } = usePolling<UnitSummary[]>(() => api.get("/units"), 3000);
  return (
    <div style={{ padding: 16, maxWidth: 480 }}>
      <h2>Units</h2>
      <UnitStatusPanel units={units ?? []} />
    </div>
  );
}
