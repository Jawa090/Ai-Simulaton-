export function StatusBadge({ value, kind = "status" }: { value: string; kind?: "status" | "severity" }) {
  return <span className={`badge ${kind}-${value}`}>{value.replace(/_/g, " ")}</span>;
}
