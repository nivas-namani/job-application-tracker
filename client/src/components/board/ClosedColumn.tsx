import { Archive } from 'lucide-react';
import type { Application } from '../../types';
import { ApplicationCard } from './ApplicationCard';

type ClosedColumnProps = { applications: Application[]; onSelect: (id: string) => void; showingArchived: boolean };

export function ClosedColumn({ applications, onSelect, showingArchived }: ClosedColumnProps) {
  return <div className="board-column border-slate-200 bg-column"><div className="board-column-header"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2 w-2 rounded-full bg-slate-400" />Closed{showingArchived && <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"><Archive className="h-3 w-3" />with archive</span>}</h2><span className="board-column-count">{applications.length}</span></div><div className="board-column-body">{applications.length ? applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} compact />) : <p className="board-empty">Nothing closed yet</p>}</div></div>;
}
