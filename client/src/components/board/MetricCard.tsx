type MetricCardProps = { label: string; value: string; note: string; alert?: boolean };

export function MetricCard({ label, value, note, alert = false }: MetricCardProps) {
  return <div className="surface-card p-4"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-[28px] font-extrabold leading-8 tracking-tight">{value}</p><p className={`mt-1 text-xs ${alert ? 'font-semibold text-amber-800' : 'text-muted'}`}>{note}</p></div>;
}
