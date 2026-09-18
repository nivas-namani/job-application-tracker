import { CalendarClock, Check, ListChecks, Pencil, Plus } from 'lucide-react';
import { stageKindMeta, type Application, type HiringProcess } from '../../types';

type HiringProcessPanelProps = {
  application: Application;
  process: HiringProcess | null;
  onCreate: () => void;
  onEdit: () => void;
  onSetStage: (stageId: string | null) => void;
};

const expectedDay = (process: HiringProcess, index: number) =>
  process.stages.slice(0, index + 1).reduce((total, stage) => total + (stage.typicalDurationDays ?? 0), 0);

export function HiringProcessPanel({ application, process, onCreate, onEdit, onSetStage }: HiringProcessPanelProps) {
  if (!process) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-bold">No process saved for {application.company} yet.</p>
      <p className="mt-1 text-sm text-muted">Record the rounds this employer runs once. Every application you track at {application.company} will show it from then on.</p>
      <button onClick={onCreate} className="button-secondary mt-3"><Plus className="h-4 w-4" />Save {application.company}&rsquo;s process</button>
    </div>;
  }

  const currentIndex = process.stages.findIndex((stage) => stage.id === application.processStageId);
  const totalDays = process.stages.reduce((total, stage) => total + (stage.typicalDurationDays ?? 0), 0);

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted"><ListChecks className="mr-1.5 inline h-4 w-4" />{process.stages.length} rounds{totalDays > 0 && ` · about ${totalDays} days end to end`}</p>
      <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-bold text-violet hover:underline"><Pencil className="h-3.5 w-3.5" />Edit</button>
    </div>

    <ol className="space-y-2">
      {process.stages.map((stage, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const current = index === currentIndex;
        return <li key={stage.id}>
          <button
            onClick={() => onSetStage(current ? null : stage.id)}
            aria-pressed={current}
            className={`w-full rounded-xl border p-3 text-left transition ${current ? 'border-violet bg-violet/[0.06] shadow-sm' : done ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white hover:border-violet/50'}`}
          >
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${current ? 'bg-violet text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-muted'}`}>{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{stage.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stageKindMeta[stage.kind].tint}`}>{stageKindMeta[stage.kind].label}</span>
            </div>
            {stage.notes && <p className="mt-1.5 pl-8 text-xs leading-5 text-muted">{stage.notes}</p>}
            {stage.typicalDurationDays !== null && <p className="mt-1 pl-8 text-[11px] text-muted"><CalendarClock className="mr-1 inline h-3 w-3" />usually {stage.typicalDurationDays} days for this round · ~day {expectedDay(process, index)} overall</p>}
            {current && <p className="mt-1.5 pl-8 text-[11px] font-bold text-violet">You are here — click again to clear</p>}
          </button>
        </li>;
      })}
    </ol>

    {currentIndex < 0 && <p className="text-xs text-muted">Click the round you are on to mark your place. It shows on the board card too.</p>}
    {process.notes && <p className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-3 text-xs leading-5 text-slate-700">{process.notes}</p>}
  </div>;
}
