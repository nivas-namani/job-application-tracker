import { useDraggable } from '@dnd-kit/core';
import { Archive, GripVertical } from 'lucide-react';
import { displayDate } from '../../lib/application-utils';
import { statusMeta, type Application } from '../../types';

type ApplicationCardProps = { application: Application; onSelect: () => void; compact?: boolean; overlay?: boolean; stageLabel?: string | null };

export function ApplicationCard({ application, onSelect, compact = false, overlay = false, stageLabel = null }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: application.id, data: { application }, disabled: compact || overlay });
  return <button ref={setNodeRef} onClick={onSelect} {...listeners} {...attributes} className={`group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card transition hover:border-violet/50 hover:shadow-md ${application.archivedAt ? 'opacity-60' : ''} ${isDragging ? 'opacity-30' : ''} ${overlay ? 'rotate-2 cursor-grabbing shadow-soft' : ''}`}>{compact ? <div className="flex items-center gap-2 text-sm font-semibold text-muted"><span className={`h-2 w-2 shrink-0 rounded-full ${statusMeta[application.status].dot}`} /><span className="min-w-0 flex-1 truncate">{application.company}</span>{application.archivedAt && <Archive className="h-3.5 w-3.5 shrink-0 text-slate-400" />}</div> : <><div className="flex gap-1"><p className="min-w-0 flex-1 truncate text-sm font-extrabold">{application.company}</p>{application.archivedAt && <Archive className="h-3.5 w-3.5 shrink-0 text-slate-400" />}<GripVertical className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" /></div><p className="mt-0.5 truncate text-xs text-muted">{application.role}</p>{stageLabel && <p className="mt-2 inline-block max-w-full truncate rounded-full bg-violet/10 px-2 py-0.5 text-[11px] font-bold text-violet">{stageLabel}</p>}<p className="mt-2 truncate text-xs text-muted">{application.status === 'SAVED' ? `Saved ${displayDate(application.createdAt)}` : application.appliedAt ? `Applied ${displayDate(application.appliedAt)}` : 'Date not set'}</p></>}</button>;
}
