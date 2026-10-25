import React, { useState, useEffect, lazy, Suspense } from 'react';
import { api } from './services/api';
import { IUser, ICompany } from './types/client';
import { AppLayout } from './layouts/AppLayout';
import { LoginView } from './features/auth/LoginView';
import { ChangePasswordModal } from './features/auth/ChangePasswordModal';

// Primary View Components (Loaded immediately for fast initial paint)
import { AdminDashboard } from './features/dashboard/AdminDashboard';
import { HRDashboard } from './features/dashboard/HRDashboard';
import { EmployeeDashboard } from './features/dashboard/EmployeeDashboard';

// Secondary View Components (Lazy loaded on demand to minimize initial bundle size and script parse time)
const FirstRunSetup = lazy(() => import('./features/setup/FirstRunSetup').then(m => ({ default: m.FirstRunSetup })));
const EmployeeDirectory = lazy(() => import('./features/employees/EmployeeDirectory').then(m => ({ default: m.EmployeeDirectory })));
const AttendanceBoard = lazy(() => import('./features/attendance/AttendanceBoard').then(m => ({ default: m.AttendanceBoard })));
const LeaveManager = lazy(() => import('./features/leave/LeaveManager').then(m => ({ default: m.LeaveManager })));
const PayrollManager = lazy(() => import('./features/payroll/PayrollManager').then(m => ({ default: m.PayrollManager })));
const OrgSettings = lazy(() => import('./features/organization/OrgSettings').then(m => ({ default: m.OrgSettings })));
const AuditLogViewer = lazy(() => import('./features/audit/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const DatabaseHealthModal = lazy(() => import('./features/database/DatabaseHealthModal').then(m => ({ default: m.DatabaseHealthModal })));
const AIAssistantDrawer = lazy(() => import('./features/ai/AIAssistantDrawer').then(m => ({ default: m.AIAssistantDrawer })));

const ComponentFallback = () => (
  <div className="p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
    <div className="h-8 bg-zinc-200/70 rounded-xl w-1/4"></div>
    <div className="h-64 bg-zinc-100 rounded-2xl border border-zinc-200/60"></div>
  </div>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [authorizedEmail, setAuthorizedEmail] = useState('asadqadri239@gmail.com');

  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [company, setCompany] = useState<ICompany | null>(null);

  // Workspace Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefilledLeave, setPrefilledLeave] = useState<any>(null);

  // Modals & Drawers
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      const token = api.getToken();

      // Parallelize Setup check and Auth session check simultaneously
      const [setupStatus, meResult] = await Promise.all([
        api.getSetupStatus(),
        token
          ? api.getMe().catch(() => {
              api.setToken(null);
              return null;
            })
          : Promise.resolve(null),
      ]);

      if (!setupStatus.isInitialized || !setupStatus.superAdminExists) {
        setSetupRequired(true);
        setAuthorizedEmail(setupStatus.authorizedBootstrapEmail || 'asadqadri239@gmail.com');
        return;
      }

      setSetupRequired(false);

      if (meResult) {
        setCurrentUser(meResult.user);
        setCompany(meResult.company);
        if (meResult.user.mustChangePassword) {
          setShowPasswordChangeModal(true);
        }
      }
    } catch (err) {
      console.error('App init check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = (user: IUser, comp: ICompany, token: string) => {
    setCurrentUser(user);
    setCompany(comp);
    setSetupRequired(false);
    setActiveTab('dashboard');
  };

  const handleLoginSuccess = async (user: IUser, token: string) => {
    setCurrentUser(user);
    try {
      const me = await api.getMe();
      setCompany(me.company);
      if (user.mustChangePassword) {
        setShowPasswordChangeModal(true);
      }
    } catch (err) {
      console.error('Failed to load profile post login:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    api.setToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handlePrefillLeaveFromAI = (extractedLeave: any) => {
    setPrefilledLeave(extractedLeave);
    setActiveTab('leave');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-extrabold text-xl shadow-md animate-pulse mb-3">
          H
        </div>
        <p className="text-xs font-semibold text-zinc-600">Initializing HCM Lite Environment...</p>
      </div>
    );
  }

  // First Run Setup Screen if Company / Super Admin uninitialized
  if (setupRequired) {
    return (
      <Suspense fallback={<ComponentFallback />}>
        <FirstRunSetup
          authorizedEmail={authorizedEmail}
          onSetupComplete={handleSetupComplete}
          onOpenHealth={() => setIsHealthOpen(true)}
        />
        <DatabaseHealthModal
          isOpen={isHealthOpen}
          onClose={() => setIsHealthOpen(false)}
          isAdmin={false}
        />
      </Suspense>
    );
  }

  // Login View if not authenticated
  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenHealth={() => setIsHealthOpen(true)}
        />
        <Suspense fallback={null}>
          <DatabaseHealthModal
            isOpen={isHealthOpen}
            onClose={() => setIsHealthOpen(false)}
            isAdmin={false}
          />
        </Suspense>
      </>
    );
  }

  // Authenticated Main Workspace Layout
  return (
    <AppLayout
      currentUser={currentUser}
      company={company}
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        setPrefilledLeave(null);
      }}
      onLogout={handleLogout}
      onOpenHealth={() => setIsHealthOpen(true)}
      onOpenAI={() => setIsAIOpen(true)}
    >
      {/* Primary Dashboard Views (Rendered instantly) */}
      {activeTab === 'dashboard' && (
        <>
          {currentUser.role === 'admin' && <AdminDashboard onNavigate={setActiveTab} />}
          {currentUser.role === 'hr' && <HRDashboard onNavigate={setActiveTab} />}
          {currentUser.role === 'employee' && (
            <EmployeeDashboard onNavigate={setActiveTab} company={company} currentUser={currentUser} />
          )}
        </>
      )}

      {/* Code-split Secondary Functional Views */}
      <Suspense fallback={<ComponentFallback />}>
        {activeTab === 'employees' && <EmployeeDirectory currentUser={currentUser} />}

        {activeTab === 'attendance' && (
          <AttendanceBoard currentUser={currentUser} company={company} />
        )}

        {activeTab === 'leave' && (
          <LeaveManager currentUser={currentUser} prefilledLeave={prefilledLeave} />
        )}

        {activeTab === 'payroll' && (
          <PayrollManager currentUser={currentUser} company={company} />
        )}

        {activeTab === 'organization' && currentUser.role === 'admin' && (
          <OrgSettings
            currentUser={currentUser}
            company={company}
            onCompanyUpdate={(comp) => setCompany(comp)}
          />
        )}

        {activeTab === 'audit' && currentUser.role === 'admin' && <AuditLogViewer />}

        {/* Global AI Assistant Drawer */}
        <AIAssistantDrawer
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          currentUser={currentUser}
          onSelectTab={setActiveTab}
          onPrefillLeave={handlePrefillLeaveFromAI}
        />

        {/* Database Diagnostic & Health Modal */}
        <DatabaseHealthModal
          isOpen={isHealthOpen}
          onClose={() => setIsHealthOpen(false)}
          isAdmin={currentUser.role === 'admin'}
        />
      </Suspense>

      {/* Mandatory Password Change Dialog */}
      {showPasswordChangeModal && (
        <ChangePasswordModal
          onSuccess={() => {
            setShowPasswordChangeModal(false);
            if (currentUser) {
              setCurrentUser({ ...currentUser, mustChangePassword: false });
            }
          }}
        />
      )}
    </AppLayout>
  );
}
