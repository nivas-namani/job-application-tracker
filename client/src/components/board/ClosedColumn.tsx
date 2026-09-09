import type { Application } from '../../types';
import { ApplicationCard } from './ApplicationCard';

type ClosedColumnProps = { applications: Application[]; onSelect: (id: string) => void };

export function ClosedColumn({ applications, onSelect }: ClosedColumnProps) {
  return <div className="w-[245px] rounded-2xl border border-slate-200 bg-column p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2 w-2 rounded-full bg-slate-400" />Closed</h2><span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-muted">{applications.length}</span></div><div className="space-y-2">{applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} compact />)}</div></div>;
}
