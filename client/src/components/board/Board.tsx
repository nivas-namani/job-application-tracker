import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Clock3, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getMetrics } from '../../lib/application-utils';
import type { Application, ApplicationStatus } from '../../types';
import { ApplicationCard } from './ApplicationCard';
import { BoardColumn } from './BoardColumn';
import { CLOSED_STATUSES, BOARD_STATUSES } from './constants';
import { ClosedColumn } from './ClosedColumn';
import { FilterButton } from './FilterButton';
import { MetricCard } from './MetricCard';

type BoardProps = { applications: Application[]; onSelect: (id: string) => void; onAdd: () => void; onStatusChange: (id: string, status: ApplicationStatus) => Promise<void> };

export function Board({ applications, onSelect, onAdd, onStatusChange }: BoardProps) {
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

  const handleDragStart = ({ active }: DragStartEvent) => setActiveDrag(active.data.current?.application as Application);
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveDrag(null);
    const application = active.data.current?.application as Application | undefined;
    const overData = over?.data.current as { status?: ApplicationStatus; application?: Application } | undefined;
    const nextStatus = overData?.status ?? overData?.application?.status;
    if (application && nextStatus && application.status !== nextStatus) await onStatusChange(application.id, nextStatus);
  };

  return <div className="page-shell"><section className="mb-6"><h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Your search</h1><p className="mt-1 text-sm text-muted">{metrics.total} applications · {metrics.active} still active</p></section><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Active" value={metrics.active.toString()} note={`of ${metrics.total} tracked`} /><MetricCard label="Response rate" value={`${metrics.responseRate}%`} note={`${metrics.replied} of ${metrics.applied} replied`} /><MetricCard label="Median reply time" value={metrics.medianReplyDays === null ? '—' : `${metrics.medianReplyDays}d`} note="applied to first reply" /><MetricCard label="Needs follow-up" value={metrics.needsFollowUp.toString()} note="quiet for 14+ days" alert={metrics.needsFollowUp > 0} /></section><section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative w-full lg:max-w-[322px]"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role or location" className="form-input py-2.5 pl-10 pr-4" /></div><div className="flex flex-wrap gap-2"><FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All</FilterButton><FilterButton active={filter === 'FOLLOW_UP'} onClick={() => setFilter('FOLLOW_UP')}><Clock3 className="h-3.5 w-3.5" />Needs follow-up</FilterButton><FilterButton active={filter === 'REFERRALS'} onClick={() => setFilter('REFERRALS')}>Referrals</FilterButton></div><label className="ml-auto inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-muted shadow-sm">Sort<select aria-label="Sort applications" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} className="bg-transparent font-semibold text-ink outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></section><DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDrag(null)}><section className="scrollbar-thin mt-5 grid min-w-max grid-cols-5 gap-3 overflow-x-auto pb-4">{BOARD_STATUSES.map((status) => <BoardColumn key={status} status={status} applications={visibleApplications.filter((application) => application.status === status)} onSelect={onSelect} onAdd={onAdd} />)}<ClosedColumn applications={visibleApplications.filter((application) => CLOSED_STATUSES.includes(application.status))} onSelect={onSelect} /></section><DragOverlay dropAnimation={null}>{activeDrag ? <ApplicationCard application={activeDrag} onSelect={() => undefined} overlay /> : null}</DragOverlay></DndContext></div>;
}
