import { FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { displayDate } from '../../lib/application-utils';
import type { Resume } from '../../types';

type ResumeRowProps = { resume: Resume };

export function ResumeRow({ resume }: ResumeRowProps) {
  return <a href={api.resumeDownloadUrl(resume.id)} className="flex items-center gap-3 rounded-xl border p-3 hover:border-violet/50"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet/10 text-violet"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{resume.fileName}</span><span className="block text-xs text-muted">{Math.ceil(resume.size / 1024)} KB · uploaded {displayDate(resume.createdAt)}</span></span><span className="text-sm font-bold text-violet">Download</span></a>;
}
