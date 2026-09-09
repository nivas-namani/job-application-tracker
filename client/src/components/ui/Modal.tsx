import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = { title: string; onClose: () => void; children: ReactNode };

export function Modal({ title, onClose, children }: ModalProps) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="scrollbar-thin max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-soft"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"><h2 className="text-xl font-extrabold tracking-tight">{title}</h2><button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="p-6">{children}</div></section></div>;
}
