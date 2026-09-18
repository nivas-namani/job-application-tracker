import type { ApplicationStatus } from '../../types';

export const BOARD_STATUSES: ApplicationStatus[] = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'];
export const CLOSED_STATUSES: ApplicationStatus[] = ['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED'];
