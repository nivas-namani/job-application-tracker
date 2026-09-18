import type { HiringStageKind } from '../../types';

export type PresetStage = { name: string; kind: HiringStageKind; typicalDurationDays: number | null };
export type ProcessPreset = { id: string; label: string; summary: string; stages: PresetStage[] };

/** Starting points for a company's process. Everything here is editable once applied. */
export const PROCESS_PRESETS: ProcessPreset[] = [
  {
    id: 'software-standard',
    label: 'Software engineering',
    summary: 'Recruiter call, one assessment, two interviews, then HR.',
    stages: [
      { name: 'Recruiter screen', kind: 'RECRUITER_SCREEN', typicalDurationDays: 3 },
      { name: 'Online assessment', kind: 'ONLINE_ASSESSMENT', typicalDurationDays: 5 },
      { name: 'Technical round 1', kind: 'TECHNICAL', typicalDurationDays: 7 },
      { name: 'Technical round 2', kind: 'TECHNICAL', typicalDurationDays: 7 },
      { name: 'HR discussion', kind: 'HR_DISCUSSION', typicalDurationDays: 3 }
    ]
  },
  {
    id: 'big-tech',
    label: 'Big tech loop',
    summary: 'Assessment, phone screen, a full onsite loop, then team match.',
    stages: [
      { name: 'Online assessment', kind: 'ONLINE_ASSESSMENT', typicalDurationDays: 7 },
      { name: 'Phone screen', kind: 'TECHNICAL', typicalDurationDays: 10 },
      { name: 'Onsite: coding', kind: 'ONSITE', typicalDurationDays: 14 },
      { name: 'Onsite: system design', kind: 'SYSTEM_DESIGN', typicalDurationDays: 14 },
      { name: 'Onsite: behavioural', kind: 'BEHAVIOURAL', typicalDurationDays: 14 },
      { name: 'Team match', kind: 'TEAM_MATCH', typicalDurationDays: 21 },
      { name: 'Offer discussion', kind: 'OFFER', typicalDurationDays: 7 }
    ]
  },
  {
    id: 'startup',
    label: 'Startup fast track',
    summary: 'Founder call, a take-home, and a short team round.',
    stages: [
      { name: 'Intro call', kind: 'RECRUITER_SCREEN', typicalDurationDays: 2 },
      { name: 'Take-home task', kind: 'ONLINE_ASSESSMENT', typicalDurationDays: 4 },
      { name: 'Technical deep dive', kind: 'TECHNICAL', typicalDurationDays: 5 },
      { name: 'Founder / hiring manager', kind: 'HIRING_MANAGER', typicalDurationDays: 3 }
    ]
  },
  {
    id: 'service-company',
    label: 'Service company drive',
    summary: 'Aptitude test, technical interview, then an HR round.',
    stages: [
      { name: 'Aptitude test', kind: 'ONLINE_ASSESSMENT', typicalDurationDays: 2 },
      { name: 'Technical interview', kind: 'TECHNICAL', typicalDurationDays: 3 },
      { name: 'Managerial round', kind: 'HIRING_MANAGER', typicalDurationDays: 3 },
      { name: 'HR round', kind: 'HR_DISCUSSION', typicalDurationDays: 2 }
    ]
  },
  {
    id: 'non-technical',
    label: 'Non-technical role',
    summary: 'Recruiter screen, hiring manager, a task, then panel.',
    stages: [
      { name: 'Recruiter screen', kind: 'RECRUITER_SCREEN', typicalDurationDays: 3 },
      { name: 'Hiring manager', kind: 'HIRING_MANAGER', typicalDurationDays: 5 },
      { name: 'Case or portfolio task', kind: 'ONLINE_ASSESSMENT', typicalDurationDays: 5 },
      { name: 'Panel interview', kind: 'BEHAVIOURAL', typicalDurationDays: 7 }
    ]
  },
  {
    id: 'blank',
    label: 'Start from scratch',
    summary: 'One empty stage to build your own.',
    stages: [{ name: 'Round 1', kind: 'OTHER', typicalDurationDays: null }]
  }
];
