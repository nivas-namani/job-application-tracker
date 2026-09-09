import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Check, ChevronDown, CircleUserRound, Clock3, FileText, GripVertical, LayoutDashboard, LogOut, Plus, Search, Trash2, Upload, X
} from 'lucide-react';
import { api, type ApplicationInput } from './lib/api';
import { displayDate, displayMoney, getMetrics } from './lib/application-utils';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type Resume, statusMeta, type User } from './types';

type View = 'board' | 'resumes';
type FormValues = {
  company: string; role: string; status: ApplicationStatus; appliedAt: string; jobUrl: string; location: string;
  source: string; salaryMin: string; salaryMax: string; currency: string; description: string; followUpAt: string; resumeId: string;
};

const boardStatuses: ApplicationStatus[] = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'];
const closedStatuses: ApplicationStatus[] = ['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED'];
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-violet focus:ring-2 focus:ring-violet/15';
const labelClass = 'mb-1.5 block text-xs font-bold text-ink';

const applicationSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(120),
  status: z.enum(APPLICATION_STATUSES),
  appliedAt: z.string(), jobUrl: z.string(), location: z.string(), source: z.string(),
  salaryMin: z.string(), salaryMax: z.string(), currency: z.string().min(3).max(3),
  description: z.string().max(5_000), followUpAt: z.string(), resumeId: z.string()
}).superRefine((value, context) => {
  if (value.jobUrl && !z.string().url().safeParse(value.jobUrl).success) {
    context.addIssue({ code: 'custom', path: ['jobUrl'], message: 'Use a complete URL, such as https://example.com.' });
  }
  if (value.salaryMin && Number.isNaN(Number(value.salaryMin))) {
    context.addIssue({ code: 'custom', path: ['salaryMin'], message: 'Enter a valid number.' });
  }
  if (value.salaryMax && Number.isNaN(Number(value.salaryMax))) {
    context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Enter a valid number.' });
  }
  if (value.salaryMin && value.salaryMax && Number(value.salaryMin) > Number(value.salaryMax)) {
    context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum must be greater than minimum.' });
  }
});

function initialFormValues(application?: Application): FormValues {
  return {
    company: application?.company ?? '', role: application?.role ?? '', status: application?.status ?? 'SAVED',
    appliedAt: application?.appliedAt?.slice(0, 10) ?? '', jobUrl: application?.jobUrl ?? '', location: application?.location ?? '',
    source: application?.source ?? '', salaryMin: application?.salaryMin?.toString() ?? '', salaryMax: application?.salaryMax?.toString() ?? '',
    currency: application?.currency ?? 'USD', description: application?.description ?? '', followUpAt: application?.followUpAt?.slice(0, 10) ?? '',
    resumeId: application?.resumeId ?? ''
  };
}

function toApplicationInput(values: FormValues): ApplicationInput {
  const textOrNull = (value: string) => value.trim() || null;
  return {
    company: values.company.trim(), role: values.role.trim(), status: values.status,
    appliedAt: textOrNull(values.appliedAt), jobUrl: textOrNull(values.jobUrl), location: textOrNull(values.location), source: textOrNull(values.source),
    salaryMin: values.salaryMin ? Number(values.salaryMin) : null, salaryMax: values.salaryMax ? Number(values.salaryMax) : null,
    currency: values.currency.toUpperCase(), description: textOrNull(values.description), followUpAt: textOrNull(values.followUpAt),
    resumeId: values.resumeId || null
  };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>('board');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Application | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedApplication = applications.find((application) => application.id === selectedId) ?? null;
  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3_500);
  };

  const loadWorkspace = async () => {
    const [applicationResponse, resumeResponse] = await Promise.all([api.applications(), api.resumes()]);
    setApplications(applicationResponse.applications);
    setResumes(resumeResponse.resumes);
  };

  useEffect(() => {
    api.me()
      .then(async ({ user: currentUser }) => { setUser(currentUser); await loadWorkspace(); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuthenticated = async (currentUser: User) => {
    setUser(currentUser);
    await loadWorkspace();
  };

  const handleSave = async (values: ApplicationInput) => {
    const response = editing
      ? await api.updateApplication(editing.id, values)
      : await api.createApplication(values);
    setApplications((current) => editing
      ? current.map((application) => application.id === response.application.id ? response.application : application)
      : [response.application, ...current]);
    setSelectedId(response.application.id);
    setShowForm(false);
    setEditing(undefined);
    showNotice(editing ? 'Application updated.' : 'Application added to your board.');
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    const response = await api.updateApplication(id, { status });
    setApplications((current) => current.map((application) => application.id === id ? response.application : application));
  };

  const handleDelete = async (application: Application) => {
    if (!window.confirm(`Delete ${application.company} from your tracker? This cannot be undone.`)) return;
    await api.deleteApplication(application.id);
    setApplications((current) => current.filter((item) => item.id !== application.id));
    setSelectedId(null);
    showNotice('Application deleted.');
  };

  const handleResumeUpload = async (file: File, applicationId?: string) => {
    const { resume } = await api.uploadResume(file, applicationId);
    setResumes((current) => [resume, ...current]);
    if (applicationId) await loadWorkspace();
    showNotice('Resume uploaded securely.');
  };

  const handleDeleteResume = async (resume: Resume) => {
    if (!window.confirm(`Delete ${resume.fileName}?`)) return;
    await api.deleteResume(resume.id);
    setResumes((current) => current.filter((item) => item.id !== resume.id));
    setApplications((current) => current.map((application) => application.resumeId === resume.id
      ? { ...application, resumeId: null, resume: null }
      : application));
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null); setApplications([]); setResumes([]); setSelectedId(null); setView('board');
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  return (
    <main className="min-h-screen">
      <Header user={user} view={view} onViewChange={setView} onAdd={() => { setEditing(undefined); setShowForm(true); }} onLogout={handleLogout} />
      {view === 'board' ? (
        <Board
          applications={applications} onSelect={setSelectedId} onAdd={() => { setEditing(undefined); setShowForm(true); }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ResumesPage resumes={resumes} onUpload={handleResumeUpload} onDelete={handleDeleteResume} />
      )}
      {showForm && (
        <ApplicationFormModal application={editing} resumes={resumes} onClose={() => { setShowForm(false); setEditing(undefined); }} onSave={handleSave} />
      )}
      {selectedApplication && (
        <ApplicationDrawer
          application={selectedApplication} resumes={resumes} onClose={() => setSelectedId(null)} onStatusChange={handleStatusChange}
          onEdit={() => { setEditing(selectedApplication); setShowForm(true); }} onDelete={() => handleDelete(selectedApplication)}
          onUpload={(file) => handleResumeUpload(file, selectedApplication.id)}
        />
      )}
      {notice && <div className="fixed bottom-5 right-5 z-[60] rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"><Check className="mr-2 inline h-4 w-4 text-emerald-300" />{notice}</div>}
    </main>
  );
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center"><div className="flex items-center gap-3 text-sm font-bold text-muted"><span className="h-5 w-5 animate-spin rounded-full border-2 border-violet border-t-transparent" />Loading Trackify</div></div>;
}

function Brand() {
  return <div className="flex items-center gap-2.5 font-extrabold tracking-tight text-ink"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet text-white"><Check className="h-4 w-4 stroke-[3]" /></span><span>Trackly</span></div>;
}

function Header({ user, view, onViewChange, onAdd, onLogout }: { user: User; view: View; onViewChange: (view: View) => void; onAdd: () => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[69px] max-w-[1600px] items-center justify-between px-5 sm:px-7">
        <div className="flex items-center gap-7"><Brand /><nav className="hidden items-center gap-1 sm:flex">
          <NavButton active={view === 'board'} onClick={() => onViewChange('board')} icon={<LayoutDashboard className="h-3.5 w-3.5" />}>Board</NavButton>
          <NavButton active={view === 'resumes'} onClick={() => onViewChange('resumes')} icon={<FileText className="h-3.5 w-3.5" />}>Resumes</NavButton>
        </nav></div>
        <div className="flex items-center gap-3"><button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-violet px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4930d7]"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add application</span><span className="sm:hidden">Add</span></button>
          <div className="relative"><button aria-label="Open account menu" onClick={() => setOpen((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-muted hover:bg-slate-50"><CircleUserRound className="h-5 w-5" /></button>
            {open && <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-2 shadow-soft"><p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p><button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"><LogOut className="h-4 w-4" />Log out</button></div>}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-violet/10 text-violet' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}>{icon}{children}</button>;
}

function Board({ applications, onSelect, onAdd, onStatusChange }: { applications: Application[]; onSelect: (id: string) => void; onAdd: () => void; onStatusChange: (id: string, status: ApplicationStatus) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'FOLLOW_UP' | 'REFERRALS'>('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [activeDrag, setActiveDrag] = useState<Application | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const metrics = getMetrics(applications);
  const visibleApplications = useMemo(() => applications.filter((application) => {
    const matchesQuery = `${application.company} ${application.role} ${application.location ?? ''}`.toLowerCase().includes(query.toLowerCase());
    const needsFollowUp = application.followUpAt ? new Date(application.followUpAt) < new Date() : application.status === 'APPLIED' && application.appliedAt && Date.now() - new Date(application.appliedAt).getTime() > 14 * 86_400_000;
    return matchesQuery && (filter === 'ALL' || filter === 'FOLLOW_UP' && needsFollowUp || filter === 'REFERRALS' && application.source?.toLowerCase() === 'referral');
  }).sort((a, b) => sort === 'newest' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [applications, query, filter, sort]);

  const handleDragEnd = async ({ active, over }: { active: { data: { current?: { application?: Application } } }; over: { data: { current?: { status?: ApplicationStatus; application?: Application } } } | null }) => {
    setActiveDrag(null);
    const application = active.data.current?.application;
    const nextStatus = over?.data.current?.status ?? over?.data.current?.application?.status;
    if (application && nextStatus && application.status !== nextStatus) await onStatusChange(application.id, nextStatus);
  };

  return <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-7">
    <section className="mb-6"><h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Your search</h1><p className="mt-1 text-sm text-muted">{metrics.total} applications · {metrics.active} still active</p></section>
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active" value={metrics.active.toString()} note={`of ${metrics.total} tracked`} />
      <MetricCard label="Response rate" value={`${metrics.responseRate}%`} note={`${metrics.replied} of ${metrics.applied} replied`} />
      <MetricCard label="Median reply time" value={metrics.medianReplyDays === null ? '—' : `${metrics.medianReplyDays}d`} note="applied to first reply" />
      <MetricCard label="Needs follow-up" value={metrics.needsFollowUp.toString()} note="quiet for 14+ days" alert={metrics.needsFollowUp > 0} />
    </section>
    <section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative w-full lg:max-w-[322px]"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role or location" className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-muted" /></div>
      <div className="flex flex-wrap gap-2"><FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All</FilterButton><FilterButton active={filter === 'FOLLOW_UP'} onClick={() => setFilter('FOLLOW_UP')}><Clock3 className="h-3.5 w-3.5" />Needs follow-up</FilterButton><FilterButton active={filter === 'REFERRALS'} onClick={() => setFilter('REFERRALS')}>Referrals</FilterButton></div>
      <label className="ml-auto inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-muted shadow-sm">Sort<select aria-label="Sort applications" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} className="bg-transparent font-semibold text-ink outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </section>
    <DndContext sensors={sensors} onDragStart={({ active }) => setActiveDrag(active.data.current?.application as Application)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDrag(null)}>
      <section className="scrollbar-thin mt-5 grid min-w-max grid-cols-5 gap-3 overflow-x-auto pb-4">
        {boardStatuses.map((status) => <BoardColumn key={status} status={status} applications={visibleApplications.filter((application) => application.status === status)} onSelect={onSelect} onAdd={onAdd} />)}
        <ClosedColumn applications={visibleApplications.filter((application) => closedStatuses.includes(application.status))} onSelect={onSelect} />
      </section>
      <DragOverlay dropAnimation={null}>{activeDrag ? <ApplicationCard application={activeDrag} onSelect={() => undefined} overlay /> : null}</DragOverlay>
    </DndContext>
  </div>;
}

function MetricCard({ label, value, note, alert = false }: { label: string; value: string; note: string; alert?: boolean }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-card"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-[28px] font-extrabold leading-8 tracking-tight">{value}</p><p className={`mt-1 text-xs ${alert ? 'font-semibold text-amber-800' : 'text-muted'}`}>{note}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${active ? 'border-violet bg-violet text-white' : 'bg-white text-muted hover:border-violet/50'}`}>{children}</button>;
}

function BoardColumn({ status, applications, onSelect, onAdd }: { status: ApplicationStatus; applications: Application[]; onSelect: (id: string) => void; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });
  const meta = statusMeta[status];
  return <div ref={setNodeRef} className={`w-[245px] rounded-2xl border p-3 transition ${isOver ? 'border-violet bg-violet/[0.06]' : 'border-slate-200 bg-column'}`}><div className="mb-3 flex items-center justify-between px-1"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</h2><span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-muted">{applications.length}</span></div>
    <div className="space-y-2">{applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} />)}</div>
    {status === 'SAVED' && <button onClick={onAdd} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-sm font-semibold text-muted hover:border-violet hover:text-violet"><Plus className="h-4 w-4" />Add</button>}
  </div>;
}

function ClosedColumn({ applications, onSelect }: { applications: Application[]; onSelect: (id: string) => void }) {
  return <div className="w-[245px] rounded-2xl border border-slate-200 bg-column p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2 w-2 rounded-full bg-slate-400" />Closed</h2><span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-muted">{applications.length}</span></div><div className="space-y-2">{applications.map((application) => <ApplicationCard key={application.id} application={application} onSelect={() => onSelect(application.id)} compact />)}</div></div>;
}

function ApplicationCard({ application, onSelect, compact = false, overlay = false }: { application: Application; onSelect: () => void; compact?: boolean; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: application.id, data: { application }, disabled: compact || overlay });
  return <button ref={setNodeRef} onClick={onSelect} {...listeners} {...attributes} className={`group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card transition hover:border-violet/50 hover:shadow-md ${isDragging ? 'opacity-30' : ''} ${overlay ? 'rotate-2 cursor-grabbing shadow-soft' : ''}`}>
    {compact ? <div className="flex items-center gap-2 text-sm font-semibold text-muted"><span className={`h-2 w-2 rounded-full ${statusMeta[application.status].dot}`} />{application.company}</div> : <><div className="flex gap-1"><p className="min-w-0 flex-1 truncate text-sm font-extrabold">{application.company}</p><GripVertical className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" /></div><p className="mt-0.5 truncate text-xs text-muted">{application.role}</p><p className="mt-2 truncate text-xs text-muted">{application.status === 'SAVED' ? `Saved ${displayDate(application.createdAt)}` : application.appliedAt ? `Applied ${displayDate(application.appliedAt)}` : 'Date not set'}</p></>}
  </button>;
}

function ApplicationFormModal({ application, resumes, onClose, onSave }: { application?: Application; resumes: Resume[]; onClose: () => void; onSave: (value: ApplicationInput) => Promise<void> }) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({ defaultValues: initialFormValues(application) });
  useEffect(() => reset(initialFormValues(application)), [application, reset]);
  const submit = handleSubmit(async (values) => {
    const parsed = applicationSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setError(issue.path[0] as keyof FormValues, { message: issue.message }));
      return;
    }
    await onSave(toApplicationInput(parsed.data));
  });
  return <Modal title={application ? 'Edit application' : 'Add application'} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Company" error={errors.company?.message}><input autoFocus className={inputClass} placeholder="BrightPath Labs" {...register('company')} /></Field><Field label="Role" error={errors.role?.message}><input className={inputClass} placeholder="Frontend Developer" {...register('role')} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><select className={inputClass} {...register('status')}>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select></Field><Field label="Applied on"><input className={inputClass} type="date" {...register('appliedAt')} /></Field></div>
      <Field label="Job posting link" error={errors.jobUrl?.message}><input className={inputClass} placeholder="https://company.com/jobs/role" {...register('jobUrl')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Location"><input className={inputClass} placeholder="City, country or Remote" {...register('location')} /></Field><Field label="Source"><input className={inputClass} placeholder="Referral, LinkedIn, company site" {...register('source')} /></Field></div>
      <div className="grid grid-cols-[1fr_16px_1fr] gap-2"><Field label="Salary range" error={errors.salaryMin?.message}><input inputMode="numeric" className={inputClass} placeholder="Min" {...register('salaryMin')} /></Field><span className="pt-9 text-center text-muted">–</span><Field label=" " error={errors.salaryMax?.message}><input inputMode="numeric" className={inputClass} placeholder="Max" {...register('salaryMax')} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Currency"><select className={inputClass} {...register('currency')}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></Field><Field label="Follow up on"><input className={inputClass} type="date" {...register('followUpAt')} /></Field></div>
      <Field label="Resume used"><select className={inputClass} {...register('resumeId')}><option value="">No resume attached</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName}</option>)}</select></Field>
      <Field label="Notes"><textarea className={`${inputClass} min-h-28 resize-y`} placeholder="Recruiter, interview notes, a deadline, or anything worth remembering." {...register('description')} /></Field>
      <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-muted">Only company, role, and status are required. You can keep the first entry quick and add the rest later.</p>
      <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-slate-50">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4930d7]">{isSubmitting ? 'Saving…' : application ? 'Save changes' : 'Save application'}</button></div>
    </form>
  </Modal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label><span className={labelClass}>{label}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-rose-700">{error}</span>}</label>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="scrollbar-thin max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-soft"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"><h2 className="text-xl font-extrabold tracking-tight">{title}</h2><button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="p-6">{children}</div></section></div>;
}

function ApplicationDrawer({ application, resumes, onClose, onStatusChange, onEdit, onDelete, onUpload }: { application: Application; resumes: Resume[]; onClose: () => void; onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>; onEdit: () => void; onDelete: () => void; onUpload: (file: File) => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const salary = [displayMoney(application.salaryMin, application.currency), displayMoney(application.salaryMax, application.currency)].filter(Boolean).join(' – ');
  return <div className="fixed inset-0 z-40 bg-ink/35" onMouseDown={onClose}><aside className="scrollbar-thin absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-soft" onMouseDown={(event) => event.stopPropagation()} aria-label={`${application.company} details`}>
    <header className="border-b px-6 py-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold tracking-tight">{application.company}</h2><p className="mt-1 text-sm text-muted">{application.role}{application.location ? ` · ${application.location}` : ''}</p></div><button aria-label="Close details" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-4 flex items-center gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta[application.status].pill}`}><span className={`h-1.5 w-1.5 rounded-full ${statusMeta[application.status].dot}`} />{statusMeta[application.status].label}</span><label className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold">Move to <select aria-label="Move application status" value={application.status} onChange={(event) => void onStatusChange(application.id, event.target.value as ApplicationStatus)} className="max-w-28 bg-transparent outline-none">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select><ChevronDown className="h-3.5 w-3.5" /></label></div></header>
    <div className="flex-1 space-y-7 px-6 py-6"><DrawerSection title="Details"><div className="grid grid-cols-2 gap-x-5 gap-y-5 text-sm"><Detail label="Applied" value={displayDate(application.appliedAt)} /><Detail label="Source" value={application.source ?? 'Not set'} /><Detail label="Salary range" value={salary || 'Not set'} /><Detail label="Follow up" value={displayDate(application.followUpAt)} /><Detail label="Location" value={application.location ?? 'Not set'} />{application.jobUrl && <Detail label="Job posting" value={<a className="break-all font-semibold text-violet hover:underline" href={application.jobUrl} target="_blank" rel="noreferrer">Open posting ↗</a>} />}</div></DrawerSection>
      <DrawerSection title="Notes"><p className="min-h-24 whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700">{application.description || 'No notes yet.'}</p></DrawerSection>
      <DrawerSection title="Resume used">{application.resume ? <ResumeRow resume={application.resume} /> : <div><p className="mb-3 text-sm text-muted">No resume attached to this application.</p><button onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload and attach'}</button></div>}<input ref={fileInput} className="hidden" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); try { await onUpload(file); } finally { setUploading(false); event.target.value = ''; } }} />{!application.resume && resumes.length > 0 && <p className="mt-3 text-xs text-muted">You can also choose an existing resume when editing this application.</p>}</DrawerSection>
      <DrawerSection title="Status history"><ol className="space-y-4 border-l border-slate-200 pl-4">{application.statusHistory.map((item) => <li key={item.id} className="relative text-sm"><span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${statusMeta[item.toStatus].dot}`} /><p className="font-bold">{item.fromStatus ? `${statusMeta[item.fromStatus].label} → ` : ''}{statusMeta[item.toStatus].label}</p><p className="mt-0.5 text-xs text-muted">{displayDate(item.changedAt)}</p></li>)}</ol></DrawerSection>
    </div>
    <footer className="sticky bottom-0 flex items-center gap-3 border-t bg-white px-6 py-4"><button onClick={onEdit} className="rounded-xl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4930d7]">Edit</button><button onClick={onDelete} className="ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete</button></footer>
  </aside></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted">{title}</h3>{children}</section>; }
function Detail({ label, value }: { label: string; value: React.ReactNode }) { return <div><p className="mb-1 text-xs text-muted">{label}</p><div className="font-semibold text-ink">{value}</div></div>; }
function ResumeRow({ resume }: { resume: Resume }) { return <a href={api.resumeDownloadUrl(resume.id)} className="flex items-center gap-3 rounded-xl border p-3 hover:border-violet/50"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet/10 text-violet"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{resume.fileName}</span><span className="block text-xs text-muted">{Math.ceil(resume.size / 1024)} KB · uploaded {displayDate(resume.createdAt)}</span></span><span className="text-sm font-bold text-violet">Download</span></a>; }

function ResumesPage({ resumes, onUpload, onDelete }: { resumes: Resume[]; onUpload: (file: File) => Promise<void>; onDelete: (resume: Resume) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => { if (!file) return; setUploading(true); try { await onUpload(file); } finally { setUploading(false); if (input.current) input.current.value = ''; } };
  return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-7"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight">Your resumes</h1><p className="mt-1 text-sm text-muted">Upload a version once, then attach it to any application.</p></div><button onClick={() => input.current?.click()} disabled={uploading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4930d7]"><Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload resume'}</button><input ref={input} type="file" className="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void upload(event.target.files?.[0])} /></div>
    <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-card">{resumes.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet/10 text-violet"><FileText className="h-6 w-6" /></span><h2 className="mt-4 font-extrabold">No resumes yet</h2><p className="mt-1 max-w-sm text-sm text-muted">Upload a PDF or Word document to keep the version you used with each application.</p></div></div> : <ul className="divide-y">{resumes.map((resume) => <li key={resume.id} className="flex items-center gap-4 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/10 text-violet"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><a href={api.resumeDownloadUrl(resume.id)} className="block truncate text-sm font-bold hover:text-violet hover:underline">{resume.fileName}</a><p className="mt-0.5 text-xs text-muted">{Math.ceil(resume.size / 1024)} KB · uploaded {displayDate(resume.createdAt)}</p></div><button onClick={() => void onDelete(resume)} aria-label={`Delete ${resume.fileName}`} className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}</section>
  </div>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login'); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; email: string; password: string }>({ defaultValues: { name: '', email: '', password: '' } });
  const submit = handleSubmit(async (values) => { setError(null); setPending(true); try { const response = mode === 'login' ? await api.login({ email: values.email, password: values.password }) : await api.register(values); await onAuthenticated(response.user); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to continue.'); } finally { setPending(false); } });
  return <div className="grid min-h-screen place-items-center bg-gradient-to-br from-violet/10 via-canvas to-white p-5"><section className="w-full max-w-[440px] rounded-3xl border bg-white p-7 shadow-soft sm:p-9"><Brand /><h1 className="mt-8 text-2xl font-extrabold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="mt-1 text-sm text-muted">{mode === 'login' ? 'Pick your job search back up.' : 'One place for every application.'}</p><form onSubmit={submit} className="mt-7 space-y-4">{mode === 'register' && <Field label="Name" error={errors.name?.message}><input className={inputClass} placeholder="Your name" {...register('name', { required: mode === 'register' ? 'Name is required' : false })} /></Field>}<Field label="Email" error={errors.email?.message}><input className={inputClass} type="email" placeholder="you@email.com" {...register('email', { required: 'Email is required' })} /></Field><Field label="Password" error={errors.password?.message}><input className={inputClass} type="password" placeholder="At least 10 characters" {...register('password', { required: 'Password is required', minLength: { value: 10, message: 'Use at least 10 characters.' } })} /></Field>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-violet py-3 text-sm font-bold text-white shadow-sm hover:bg-[#4930d7]">{pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button></form><p className="mt-6 text-center text-sm text-muted">{mode === 'login' ? 'New here?' : 'Already registered?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="font-bold text-violet hover:underline">{mode === 'login' ? 'Create an account' : 'Log in'}</button></p></section></div>;
}

export default App;
