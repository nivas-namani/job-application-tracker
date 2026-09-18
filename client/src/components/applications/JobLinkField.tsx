import { AlertTriangle, Link2, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, type ParsedJobPosting } from '../../lib/api';
import { Field } from '../ui/Field';

type JobLinkFieldProps = {
  error?: string;
  register: Record<string, unknown>;
  getUrl: () => string;
  onParsed: (posting: ParsedJobPosting, canonicalUrl: string) => string[];
};

const looksLikeUrl = (value: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S*$/i.test(value.trim());

/**
 * Reads a public job posting through the API and hands the fields back to the form.
 * Only blank fields are filled, so anything already typed is never overwritten.
 */
export function JobLinkField({ error, register, getUrl, onParsed }: JobLinkFieldProps) {
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [result, setResult] = useState<{ tone: 'success' | 'warn'; message: string } | null>(null);
  const lastFetched = useRef('');

  const fetchDetails = async () => {
    const url = getUrl().trim();
    if (!url) { setResult({ tone: 'warn', message: 'Paste a job link first.' }); return; }
    lastFetched.current = url;
    setState('loading');
    setResult(null);
    try {
      const { posting, jobUrl } = await api.parseJobLink(url);
      const filled = onParsed(posting, jobUrl);
      setResult(filled.length
        ? { tone: 'success', message: `Filled ${filled.join(', ')}. Check it before saving.` }
        : { tone: 'warn', message: 'Nothing new to fill — your fields already have values.' });
    } catch (reason) {
      setResult({ tone: 'warn', message: reason instanceof Error ? reason.message : 'Could not read that link.' });
    } finally {
      setState('idle');
    }
  };

  return <Field label="Job posting link" error={error}>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="form-input pl-9"
          placeholder="https://company.com/jobs/role"
          {...register}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text').trim();
            if (looksLikeUrl(pasted) && pasted !== lastFetched.current) window.setTimeout(() => void fetchDetails(), 60);
          }}
        />
      </div>
      <button type="button" onClick={() => void fetchDetails()} disabled={state === 'loading'} className="button-secondary shrink-0 whitespace-nowrap">
        <Sparkles className="h-4 w-4" />{state === 'loading' ? 'Reading…' : 'Fetch details'}
      </button>
    </div>
    {result && <p className={`mt-1.5 flex items-start gap-1.5 text-xs font-medium ${result.tone === 'success' ? 'text-emerald-700' : 'text-amber-800'}`}>
      {result.tone === 'success' ? <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}{result.message}
    </p>}
  </Field>;
}
