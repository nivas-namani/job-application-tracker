import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, type ImportResult } from '../../lib/api';
import { Modal } from '../ui/Modal';

type TransferModalProps = { onClose: () => void; onImported: (result: ImportResult) => Promise<void> };

const TEMPLATE_HEADERS = 'company,role,status,appliedAt,jobUrl,location,source,salaryMin,salaryMax,currency,followUpAt,description';

export function TransferModal({ onClose, onImported }: TransferModalProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await api.importApplications(await file.text());
      setResult(outcome);
      await onImported(outcome);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read that file.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return <Modal title="Import and export" onClose={onClose}>
    <div className="space-y-6">
      <section>
        <h3 className="section-heading">Export</h3>
        <p className="mb-3 text-sm text-muted">Download every application, including archived ones, as a spreadsheet-ready CSV.</p>
        <a href={api.exportUrl()} className="button-secondary inline-flex"><Download className="h-4 w-4" />Download CSV</a>
      </section>

      <section>
        <h3 className="section-heading">Import</h3>
        <p className="mb-3 text-sm text-muted">Bring in applications from another tracker or a spreadsheet. Up to 500 rows at a time. Company and role are required; anything else is optional.</p>
        <code className="mb-3 block overflow-x-auto whitespace-pre rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">{TEMPLATE_HEADERS}</code>
        <button onClick={() => fileInput.current?.click()} disabled={busy} className="button-secondary"><Upload className="h-4 w-4" />{busy ? 'Importing…' : 'Choose CSV file'}</button>
        <input ref={fileInput} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void importFile(event.target.files?.[0])} />
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
      {result && <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-bold">{result.imported} imported{result.skipped > 0 && `, ${result.skipped} skipped`}.</p>
        {result.errors.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted">{result.errors.map((issue) => <li key={issue.row}>Row {issue.row}: {issue.message}</li>)}</ul>}
      </div>}

      <div className="flex justify-end border-t pt-4"><button onClick={onClose} className="button-secondary">Done</button></div>
    </div>
  </Modal>;
}
