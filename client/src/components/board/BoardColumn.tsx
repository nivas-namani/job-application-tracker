import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { statusMeta, type Application, type ApplicationStatus } from '../../types';
import { ApplicationCard } from './ApplicationCard';

type BoardColumnProps = { status: ApplicationStatus; applications: Application[]; onSelect: (id: string) => void; onAdd: () => void };

export function BoardColumn({ status, applications, onSelect, onAdd }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });
  const meta = statusMeta[status];
  return <div ref={setNodeRef} className={`w-[245px] rounded-2xl border p-3 transition ${isOver ? 'border-violet bg-violet/[0.06]' : 'border-slate-200 bg-column'}`}><div className="mb-3 flex items-center justify-between px-1"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</h2><span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-muted">{applications.length}</span></div><div className="space-y-2">{applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} />)}</div>{status === 'SAVED' && <button onClick={onAdd} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-sm font-semibold text-muted hover:border-violet hover:text-violet"><Plus className="h-4 w-4" />Add</button>}</div>;
}
