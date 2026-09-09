import type { Application, ApplicationStatus, Resume, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Something went wrong. Please try again.' }));
    throw new Error(body.message ?? 'Something went wrong. Please try again.');
  }

  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export type ApplicationInput = {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt?: string | null;
  jobUrl?: string | null;
  location?: string | null;
  source?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  description?: string | null;
  followUpAt?: string | null;
  resumeId?: string | null;
};

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
  applications: () => request<{ applications: Application[] }>('/applications'),
  createApplication: (data: ApplicationInput) =>
    request<{ application: Application }>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplication: (id: string, data: Partial<ApplicationInput>) =>
    request<{ application: Application }>(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApplication: (id: string) => request<void>(`/applications/${id}`, { method: 'DELETE' }),
  resumes: () => request<{ resumes: Resume[] }>('/resumes'),
  uploadResume: (file: File, applicationId?: string) => {
    const formData = new FormData();
    formData.append('resume', file);
    if (applicationId) formData.append('applicationId', applicationId);
    return request<{ resume: Resume }>('/resumes', { method: 'POST', body: formData });
  },
  deleteResume: (id: string) => request<void>(`/resumes/${id}`, { method: 'DELETE' }),
  resumeDownloadUrl: (id: string) => `${API_BASE}/resumes/${id}/download`
};
