import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { companyKeyFor, stageKindMeta, type Application, type HiringProcess } from '../../types';

type ProcessesPageProps = {
  processes: HiringProcess[];
  applications: Application[];
  onCreate: () => void;
  onEdit: (process: HiringProcess) => void;
  onDelete: (process: HiringProcess) => void;
};

export function ProcessesPage({ processes, applications, onCreate, onEdit, onDelete }: ProcessesPageProps) {
  const applicationCounts = applications.reduce<Record<string, number>>((counts, application) => {
    const key = companyKeyFor(application.company);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const companiesWithoutProcess = [...new Set(applications.map((application) => application.company))]
    .filter((company) => !processes.some((process) => process.companyKey === companyKeyFor(company)))
    .slice(0, 8);

  return <div className="page-shell">
    <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Hiring processes</h1>
        <p className="mt-1 text-sm text-muted">Record how each employer recruits once. Every application at that company shows the rounds automatically, starting from screening.</p>
      </div>
      <button onClick={onCreate} className="button-primary"><Plus className="h-4 w-4" />Add process</button>
    </section>

    {processes.length === 0
      ? <div className="surface-card grid place-items-center px-6 py-16 text-center">
          <p className="text-lg font-extrabold">Nothing saved yet</p>
          <p className="mt-1 max-w-md text-sm text-muted">Start with a known pattern — big tech loop, startup fast track, service company drive — then adjust it to what the employer actually does.</p>
          <button onClick={onCreate} className="button-primary mt-4"><Plus className="h-4 w-4" />Add your first process</button>
        </div>
      : <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {processes.map((process) => {
            const totalDays = process.stages.reduce((total, stage) => total + (stage.typicalDurationDays ?? 0), 0);
            const tracked = applicationCounts[process.companyKey] ?? 0;
            return <article key={process.id} className="surface-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold tracking-tight">{process.company}</h2>
                  <p className="mt-0.5 text-xs text-muted">{process.stages.length} rounds{totalDays > 0 && ` · ~${totalDays} days`}{tracked > 0 && ` · ${tracked} application${tracked === 1 ? '' : 's'}`}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label={`Edit ${process.company} process`} onClick={() => onEdit(process)} className="rounded-lg p-1.5 text-muted hover:bg-slate-50 hover:text-violet"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${process.company} process`} onClick={() => onDelete(process)} className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <ol className="mt-4 flex-1 space-y-2">
                {process.stages.map((stage, index) => <li key={stage.id} className="flex items-center gap-2 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-extrabold text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{stage.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stageKindMeta[stage.kind].tint}`}>{stageKindMeta[stage.kind].label}</span>
                  {stage.typicalDurationDays !== null && <span className="shrink-0 text-[11px] text-muted"><CalendarClock className="mr-0.5 inline h-3 w-3" />{stage.typicalDurationDays}d</span>}
                </li>)}
              </ol>
              {process.notes && <p className="mt-4 line-clamp-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{process.notes}</p>}
            </article>;
          })}
        </section>}

    {companiesWithoutProcess.length > 0 && <section className="mt-8">
      <h2 className="section-heading">Companies on your board with no process saved</h2>
      <div className="flex flex-wrap gap-2">
        {companiesWithoutProcess.map((company) => <span key={company} className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-muted">{company}</span>)}
      </div>
    </section>}
  </div>;
}
