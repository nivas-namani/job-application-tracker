import type { ReactNode } from 'react';

type DetailProps = { label: string; value: ReactNode };

export function Detail({ label, value }: DetailProps) {
  return <div><p className="mb-1 text-xs text-muted">{label}</p><div className="font-semibold text-ink">{value}</div></div>;
}
