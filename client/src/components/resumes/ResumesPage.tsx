import { FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { displayDate } from '../../lib/application-utils';
import type { Resume } from '../../types';

type ResumesPageProps = { resumes: Resume[]; onUpload: (file: File) => Promise<void>; onDelete: (resume: Resume) => Promise<void> };

export function ResumesPage({ resumes, onUpload, onDelete }: ResumesPageProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); if (input.current) input.current.value = ''; }
  };

  return <div className="page-shell max-w-5xl"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight">Your resumes</h1><p className="mt-1 text-sm text-muted">Upload a version once, then attach it to any application.</p></div><button onClick={() => input.current?.click()} disabled={uploading} className="button-primary shrink-0"><Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload resume'}</button><input ref={input} type="file" className="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void upload(event.target.files?.[0])} /></div><section className="surface-card mt-7 overflow-hidden">{resumes.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet/10 text-violet"><FileText className="h-6 w-6" /></span><h2 className="mt-4 font-extrabold">No resumes yet</h2><p className="mt-1 max-w-sm text-sm text-muted">Upload a PDF or Word document to keep the version you used with each application.</p></div></div> : <ul className="divide-y">{resumes.map((resume) => <li key={resume.id} className="flex items-center gap-4 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/10 text-violet"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><a href={api.resumeDownloadUrl(resume.id)} className="block truncate text-sm font-bold hover:text-violet hover:underline">{resume.fileName}</a><p className="mt-0.5 text-xs text-muted">{Math.ceil(resume.size / 1024)} KB · uploaded {displayDate(resume.createdAt)}</p></div><button onClick={() => void onDelete(resume)} aria-label={`Delete ${resume.fileName}`} className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}</section></div>;
}
