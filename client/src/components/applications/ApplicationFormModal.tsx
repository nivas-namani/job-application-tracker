import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ApplicationInput, ParsedJobPosting } from '../../lib/api';
import { APPLICATION_STATUSES, statusMeta, type Application, type Resume } from '../../types';
import { applicationFormSchema, getApplicationFormDefaults, toApplicationInput, type ApplicationFormValues } from '../../features/applications/form';
import { Field } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { JobLinkField } from './JobLinkField';

type ApplicationFormModalProps = { application?: Application; resumes: Resume[]; onClose: () => void; onSave: (value: ApplicationInput) => Promise<void> };

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];

export function ApplicationFormModal({ application, resumes, onClose, onSave }: ApplicationFormModalProps) {
  const { register, handleSubmit, reset, setError, setValue, getValues, formState: { errors, isSubmitting } } = useForm<ApplicationFormValues>({ defaultValues: getApplicationFormDefaults(application) });
  useEffect(() => reset(getApplicationFormDefaults(application)), [application, reset]);

  /** Fills blanks only and reports which fields changed, so a fetch can never clobber typed input. */
  const applyPosting = (posting: ParsedJobPosting, canonicalUrl: string) => {
    const filled: string[] = [];
    const fill = (name: keyof ApplicationFormValues, value: string | null, label: string) => {
      if (!value || getValues(name)?.toString().trim()) return;
      setValue(name, value, { shouldDirty: true });
      filled.push(label);
    };
    fill('company', posting.company, 'company');
    fill('role', posting.role, 'role');
    fill('location', posting.location, 'location');
    fill('source', posting.source, 'source');
    fill('description', posting.description, 'notes');
    fill('salaryMin', posting.salaryMin?.toString() ?? null, 'salary min');
    fill('salaryMax', posting.salaryMax?.toString() ?? null, 'salary max');
    if (posting.currency && SUPPORTED_CURRENCIES.includes(posting.currency) && getValues('currency') === 'USD' && posting.currency !== 'USD') {
      setValue('currency', posting.currency, { shouldDirty: true });
      filled.push('currency');
    }
    if (canonicalUrl && canonicalUrl !== getValues('jobUrl')) setValue('jobUrl', canonicalUrl, { shouldDirty: true });
    return filled;
  };

  const submit = handleSubmit(async (values) => {
    const parsed = applicationFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setError(issue.path[0] as keyof ApplicationFormValues, { message: issue.message }));
      return;
    }
    await onSave(toApplicationInput(parsed.data));
  });

  return <Modal title={application ? 'Edit application' : 'Add application'} onClose={onClose}><form onSubmit={submit} className="space-y-4"><JobLinkField error={errors.jobUrl?.message} register={register('jobUrl')} getUrl={() => getValues('jobUrl')} onParsed={applyPosting} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Company" error={errors.company?.message}><input autoFocus className="form-input" placeholder="BrightPath Labs" {...register('company')} /></Field><Field label="Role" error={errors.role?.message}><input className="form-input" placeholder="Frontend Developer" {...register('role')} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><select className="form-input" {...register('status')}>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select></Field><Field label="Applied on"><input className="form-input" type="date" {...register('appliedAt')} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Location"><input className="form-input" placeholder="City, country or Remote" {...register('location')} /></Field><Field label="Source"><input className="form-input" placeholder="Referral, LinkedIn, company site" {...register('source')} /></Field></div><div className="grid grid-cols-[1fr_16px_1fr] gap-2"><Field label="Salary range" error={errors.salaryMin?.message}><input inputMode="numeric" className="form-input" placeholder="Min" {...register('salaryMin')} /></Field><span className="pt-9 text-center text-muted">–</span><Field label=" " error={errors.salaryMax?.message}><input inputMode="numeric" className="form-input" placeholder="Max" {...register('salaryMax')} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Currency"><select className="form-input" {...register('currency')}>{SUPPORTED_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="Follow up on"><input className="form-input" type="date" {...register('followUpAt')} /></Field></div><Field label="Resume used"><select className="form-input" {...register('resumeId')}><option value="">No resume attached</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName}</option>)}</select></Field><Field label="Notes"><textarea className="form-input min-h-28 resize-y" placeholder="Recruiter, interview notes, a deadline, or anything worth remembering." {...register('description')} /></Field><p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-muted">Paste the posting link first and Trackify fills the blanks for you. Only company, role, and status are required.</p><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} className="button-secondary">Cancel</button><button disabled={isSubmitting} className="button-primary">{isSubmitting ? 'Saving…' : application ? 'Save changes' : 'Save application'}</button></div></form></Modal>;
}
