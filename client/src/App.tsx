import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApplicationDrawer } from './components/applications/ApplicationDrawer';
import { ApplicationFormModal } from './components/applications/ApplicationFormModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { Board } from './components/board/Board';
import { Header, type AppView } from './components/layout/Header';
import { ResumesPage } from './components/resumes/ResumesPage';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { api, type ApplicationInput } from './lib/api';
import type { Application, ApplicationStatus, Resume, User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<AppView>('board');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Application | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedApplication = applications.find((application) => application.id === selectedId) ?? null;

  const showNotice = (message: string, tone: 'success' | 'error' = 'success') => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 3_500);
  };

  const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Something went wrong. Please try again.';

  const loadWorkspace = async () => {
    const [applicationResponse, resumeResponse] = await Promise.all([api.applications(), api.resumes()]);
    setApplications(applicationResponse.applications);
    setResumes(resumeResponse.resumes);
  };

  useEffect(() => {
    api.me()
      .then(async ({ user: currentUser }) => { await loadWorkspace(); setUser(currentUser); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuthenticated = async (currentUser: User) => {
    await loadWorkspace();
    setUser(currentUser);
  };

  const handleSave = async (values: ApplicationInput) => {
    try {
      const response = editing ? await api.updateApplication(editing.id, values) : await api.createApplication(values);
      setApplications((current) => editing ? current.map((application) => application.id === response.application.id ? response.application : application) : [response.application, ...current]);
      setSelectedId(response.application.id);
      setShowForm(false);
      setEditing(undefined);
      showNotice(editing ? 'Application updated.' : 'Application added to your board.');
    } catch (reason) {
      showNotice(errorMessage(reason), 'error');
    }
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      const response = await api.updateApplication(id, { status });
      setApplications((current) => current.map((application) => application.id === id ? response.application : application));
    } catch (reason) {
      showNotice(errorMessage(reason), 'error');
    }
  };

  const handleDeleteApplication = async (application: Application) => {
    if (!window.confirm(`Delete ${application.company} from your tracker? This cannot be undone.`)) return;
    try {
      await api.deleteApplication(application.id);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setSelectedId(null);
      showNotice('Application deleted.');
    } catch (reason) {
      showNotice(errorMessage(reason), 'error');
    }
  };

  const handleResumeUpload = async (file: File, applicationId?: string) => {
    try {
      const { resume } = await api.uploadResume(file, applicationId);
      setResumes((current) => [resume, ...current]);
      if (applicationId) await loadWorkspace();
      showNotice('Resume uploaded securely.');
    } catch (reason) {
      showNotice(errorMessage(reason), 'error');
    }
  };

  const handleDeleteResume = async (resume: Resume) => {
    if (!window.confirm(`Delete ${resume.fileName}?`)) return;
    try {
      await api.deleteResume(resume.id);
      setResumes((current) => current.filter((item) => item.id !== resume.id));
      setApplications((current) => current.map((application) => application.resumeId === resume.id ? { ...application, resumeId: null, resume: null } : application));
    } catch (reason) {
      showNotice(errorMessage(reason), 'error');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setApplications([]);
    setResumes([]);
    setSelectedId(null);
    setView('board');
  };

  const openCreateForm = () => { setEditing(undefined); setShowForm(true); };

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  return <main className="min-h-screen"><Header user={user} view={view} onViewChange={setView} onAdd={openCreateForm} onLogout={handleLogout} />{view === 'board' ? <Board applications={applications} onSelect={setSelectedId} onAdd={openCreateForm} onStatusChange={handleStatusChange} /> : <ResumesPage resumes={resumes} onUpload={handleResumeUpload} onDelete={handleDeleteResume} />}{showForm && <ApplicationFormModal application={editing} resumes={resumes} onClose={() => { setShowForm(false); setEditing(undefined); }} onSave={handleSave} />}{selectedApplication && <ApplicationDrawer application={selectedApplication} resumes={resumes} onClose={() => setSelectedId(null)} onStatusChange={handleStatusChange} onEdit={() => { setEditing(selectedApplication); setShowForm(true); }} onDelete={() => void handleDeleteApplication(selectedApplication)} onUpload={(file) => handleResumeUpload(file, selectedApplication.id)} />}{notice && <div role="status" className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-soft ${notice.tone === 'error' ? 'bg-rose-700' : 'bg-ink'}`}><Check className="mr-2 inline h-4 w-4 text-emerald-300" />{notice.message}</div>}</main>;
}
