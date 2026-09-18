import type { ReactNode } from 'react';

type FilterButtonProps = { active: boolean; onClick: () => void; children: ReactNode };

export function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${active ? 'border-violet bg-violet text-white' : 'bg-white text-muted hover:border-violet/50'}`}>{children}</button>;
}
