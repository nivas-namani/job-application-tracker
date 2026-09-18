import type { ReactNode } from 'react';

type FieldProps = { label: string; error?: string; children: ReactNode };

export function Field({ label, error, children }: FieldProps) {
  return <label><span className="form-label">{label}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-rose-700">{error}</span>}</label>;
}
