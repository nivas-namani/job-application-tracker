import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ApplicationInput } from '../../lib/api';
import { APPLICATION_STATUSES, statusMeta, type Application, type Resume } from '../../types';
import { applicationFormSchema, getApplicationFormDefaults, toApplicationInput, type ApplicationFormValues } from '../../features/applications/form';
import { Field } from '../ui/Field';
import { Modal } from '../ui/Modal';

type ApplicationFormModalProps = { application?: Application; resumes: Resume[]; onClose: () => void; onSave: (value: ApplicationInput) => Promise<void> };

export function ApplicationFormModal({ application, resumes, onClose, onSave }: ApplicationFormModalProps) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ApplicationFormValues>({ defaultValues: getApplicationFormDefaults(application) });
  useEffect(() => reset(getApplicationFormDefaults(application)), [application, reset]);

  const submit = handleSubmit(async (values) => {
    const parsed = applicationFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setError(issue.path[0] as keyof ApplicationFormValues, { message: issue.message }));
      return;
    }
    await onSave(toApplicationInput(parsed.data));
  });

  return <Modal title={application ? 'Edit application' : 'Add application'} onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Company" error={errors.company?.message}><input autoFocus className="form-input" placeholder="BrightPath Labs" {...register('company')} /></Field><Field label="Role" error={errors.role?.message}><input className="form-input" placeholder="Frontend Developer" {...register('role')} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><select className="form-input" {...register('status')}>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select></Field><Field label="Applied on"><input className="form-input" type="date" {...register('appliedAt')} /></Field></div><Field label="Job posting link" error={errors.jobUrl?.message}><input className="form-input" placeholder="https://company.com/jobs/role" {...register('jobUrl')} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Location"><input className="form-input" placeholder="City, country or Remote" {...register('location')} /></Field><Field label="Source"><input className="form-input" placeholder="Referral, LinkedIn, company site" {...register('source')} /></Field></div><div className="grid grid-cols-[1fr_16px_1fr] gap-2"><Field label="Salary range" error={errors.salaryMin?.message}><input inputMode="numeric" className="form-input" placeholder="Min" {...register('salaryMin')} /></Field><span className="pt-9 text-center text-muted">–</span><Field label=" " error={errors.salaryMax?.message}><input inputMode="numeric" className="form-input" placeholder="Max" {...register('salaryMax')} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Currency"><select className="form-input" {...register('currency')}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></Field><Field label="Follow up on"><input className="form-input" type="date" {...register('followUpAt')} /></Field></div><Field label="Resume used"><select className="form-input" {...register('resumeId')}><option value="">No resume attached</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName}</option>)}</select></Field><Field label="Notes"><textarea className="form-input min-h-28 resize-y" placeholder="Recruiter, interview notes, a deadline, or anything worth remembering." {...register('description')} /></Field><p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-muted">Only company, role, and status are required. You can keep the first entry quick and add the rest later.</p><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} className="button-secondary">Cancel</button><button disabled={isSubmitting} className="button-primary">{isSubmitting ? 'Saving…' : application ? 'Save changes' : 'Save application'}</button></div></form></Modal>;
}
