import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { HiringProcessInput } from '../../lib/api';
import { PROCESS_PRESETS } from '../../features/processes/presets';
import { HIRING_STAGE_KINDS, stageKindMeta, type HiringProcess, type HiringStageKind } from '../../types';
import { Field } from '../ui/Field';
import { Modal } from '../ui/Modal';

type StageDraft = { name: string; kind: HiringStageKind; typicalDurationDays: string; notes: string };

type ProcessEditorModalProps = {
  process?: HiringProcess;
  defaultCompany?: string;
  onClose: () => void;
  onSave: (value: HiringProcessInput, id?: string) => Promise<void>;
};

const toDraft = (process?: HiringProcess): StageDraft[] => process?.stages.map((stage) => ({
  name: stage.name, kind: stage.kind, typicalDurationDays: stage.typicalDurationDays?.toString() ?? '', notes: stage.notes ?? ''
})) ?? [];

export function ProcessEditorModal({ process, defaultCompany = '', onClose, onSave }: ProcessEditorModalProps) {
  const [company, setCompany] = useState(process?.company ?? defaultCompany);
  const [notes, setNotes] = useState(process?.notes ?? '');
  const [stages, setStages] = useState<StageDraft[]>(toDraft(process));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateStage = (index: number, patch: Partial<StageDraft>) =>
    setStages((current) => current.map((stage, position) => position === index ? { ...stage, ...patch } : stage));
  const moveStage = (index: number, direction: -1 | 1) => setStages((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const applyPreset = (presetId: string) => {
    const preset = PROCESS_PRESETS.find((item) => item.id === presetId);
    if (preset) setStages(preset.stages.map((stage) => ({ name: stage.name, kind: stage.kind, typicalDurationDays: stage.typicalDurationDays?.toString() ?? '', notes: '' })));
  };

  const submit = async () => {
    const trimmedStages = stages.map((stage) => ({ ...stage, name: stage.name.trim() })).filter((stage) => stage.name);
    if (!company.trim()) { setError('Enter the company this process belongs to.'); return; }
    if (!trimmedStages.length) { setError('Add at least one stage, or pick a starting point above.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        company: company.trim(),
        notes: notes.trim() || null,
        stages: trimmedStages.map((stage) => ({
          name: stage.name,
          kind: stage.kind,
          typicalDurationDays: stage.typicalDurationDays.trim() ? Number(stage.typicalDurationDays) : null,
          notes: stage.notes.trim() || null
        }))
      }, process?.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this process.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={process ? `Edit ${process.company} process` : 'Save a hiring process'} onClose={onClose}>
    <div className="space-y-5">
      <Field label="Company"><input autoFocus className="form-input" placeholder="BrightPath Labs" value={company} onChange={(event) => setCompany(event.target.value)} /></Field>

      <div>
        <p className="form-label">Start from a known pattern</p>
        <div className="flex flex-wrap gap-2">
          {PROCESS_PRESETS.map((preset) => <button key={preset.id} type="button" title={preset.summary} onClick={() => applyPreset(preset.id)} className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-violet hover:text-violet">{preset.label}</button>)}
        </div>
        <p className="mt-1.5 text-xs text-muted">Picking one replaces the stages below. Edit them freely afterwards.</p>
      </div>

      <div className="space-y-3">
        <p className="form-label">Stages, in order</p>
        {stages.map((stage, index) => <div key={index} className="rounded-xl border bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-muted">{index + 1}</span>
            <input aria-label={`Stage ${index + 1} name`} className="form-input flex-1" placeholder="Technical round" value={stage.name} onChange={(event) => updateStage(index, { name: event.target.value })} />
            <button type="button" aria-label="Move stage up" onClick={() => moveStage(index, -1)} disabled={index === 0} className="rounded-lg p-1.5 text-muted hover:bg-white"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move stage down" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} className="rounded-lg p-1.5 text-muted hover:bg-white"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" aria-label="Remove stage" onClick={() => setStages((current) => current.filter((_, position) => position !== index))} className="rounded-lg p-1.5 text-rose-700 hover:bg-white"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px]">
            <select aria-label={`Stage ${index + 1} type`} className="form-input" value={stage.kind} onChange={(event) => updateStage(index, { kind: event.target.value as HiringStageKind })}>
              {HIRING_STAGE_KINDS.map((kind) => <option key={kind} value={kind}>{stageKindMeta[kind].label}</option>)}
            </select>
            <input aria-label={`Stage ${index + 1} typical days`} inputMode="numeric" className="form-input" placeholder="Days" value={stage.typicalDurationDays} onChange={(event) => updateStage(index, { typicalDurationDays: event.target.value.replace(/[^0-9]/g, '') })} />
          </div>
          <input aria-label={`Stage ${index + 1} notes`} className="form-input mt-2" placeholder="What to expect, who runs it, what to prepare" value={stage.notes} onChange={(event) => updateStage(index, { notes: event.target.value })} />
        </div>)}
        <button type="button" onClick={() => setStages((current) => [...current, { name: '', kind: 'OTHER', typicalDurationDays: '', notes: '' }])} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-sm font-semibold text-muted hover:border-violet hover:text-violet"><Plus className="h-4 w-4" />Add stage</button>
      </div>

      <Field label="Notes about this employer"><textarea className="form-input min-h-20 resize-y" placeholder="Recruiter contact, how long they usually take, what they focus on." value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
      <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-muted">Saved once per company. Every application you track at this employer, now or later, shows this process automatically.</p>

      <div className="flex justify-end gap-3 border-t pt-4">
        <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={saving} className="button-primary">{saving ? 'Saving…' : process ? 'Save changes' : 'Save process'}</button>
      </div>
    </div>
  </Modal>;
}
