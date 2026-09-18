import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { statusMeta, type Application, type ApplicationStatus } from '../../types';
import { ApplicationCard } from './ApplicationCard';

type BoardColumnProps = { status: ApplicationStatus; applications: Application[]; stageNames: Map<string, string>; onSelect: (id: string) => void; onAdd: () => void };

export function BoardColumn({ status, applications, stageNames, onSelect, onAdd }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });
  const meta = statusMeta[status];
  return <div ref={setNodeRef} className={`board-column ${isOver ? 'border-violet bg-violet/[0.06]' : 'border-slate-200 bg-column'}`}><div className="board-column-header"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</h2><span className="board-column-count">{applications.length}</span></div><div className="board-column-body">{applications.length ? applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} stageLabel={application.processStageId ? stageNames.get(application.processStageId) ?? null : null} />) : <p className="board-empty">{isOver ? `Drop to move here` : `Nothing in ${meta.label.toLowerCase()}`}</p>}</div>{status === 'SAVED' && <button onClick={onAdd} className="mt-2 flex w-full shrink-0 items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-sm font-semibold text-muted hover:border-violet hover:text-violet"><Plus className="h-4 w-4" />Add</button>}</div>;
}
