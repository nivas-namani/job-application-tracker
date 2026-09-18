import { CircleUserRound, FileText, LayoutDashboard, ListChecks, LogOut, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { User } from '../../types';
import { Brand } from '../ui/Brand';

export type AppView = 'board' | 'processes' | 'resumes';

type HeaderProps = {
  user: User;
  view: AppView;
  onViewChange: (view: AppView) => void;
  onAdd: () => void;
  onLogout: () => void;
};

export function Header({ user, view, onViewChange, onAdd, onLogout }: HeaderProps) {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex h-[69px] max-w-[1600px] items-center justify-between px-5 sm:px-7"><div className="flex items-center gap-7"><Brand /><nav className="hidden items-center gap-1 sm:flex"><NavigationButton active={view === 'board'} onClick={() => onViewChange('board')} icon={<LayoutDashboard className="h-3.5 w-3.5" />}>Board</NavigationButton><NavigationButton active={view === 'processes'} onClick={() => onViewChange('processes')} icon={<ListChecks className="h-3.5 w-3.5" />}>Processes</NavigationButton><NavigationButton active={view === 'resumes'} onClick={() => onViewChange('resumes')} icon={<FileText className="h-3.5 w-3.5" />}>Resumes</NavigationButton></nav></div><div className="flex items-center gap-3"><button onClick={onAdd} className="button-primary"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add application</span><span className="sm:hidden">Add</span></button><div className="relative"><button aria-label="Open account menu" onClick={() => setOpen((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-muted hover:bg-slate-50"><CircleUserRound className="h-5 w-5" /></button>{open && <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-2 shadow-soft"><p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p><button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"><LogOut className="h-4 w-4" />Log out</button></div>}</div></div></div></header>;
}

type NavigationButtonProps = { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode };

function NavigationButton({ active, onClick, icon, children }: NavigationButtonProps) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-violet/10 text-violet' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}>{icon}{children}</button>;
}
