import React, { Suspense, lazy } from 'react';
import { ExamProvider, useExam } from './context/ExamContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Toast from './components/layout/Toast';
import DashboardView from './components/dashboard/DashboardView';
import SessionView from './components/session/SessionView';
import ResultsView from './components/results/ResultsView';
import ConfirmModal from './components/modals/ConfirmModal';
import ShortcutsModal from './components/modals/ShortcutsModal';
import DataBackupModal from './components/modals/DataBackupModal';

// Rarely used views are loaded on demand to keep the first load fast
const QuestionBankView = lazy(() => import('./components/bank/QuestionBankView'));
const AdminPortalView = lazy(() => import('./components/admin/AdminPortalView'));

function AppLayout() {
  const { activeView } = useExam();
  useKeyboardShortcuts();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-workspace">
        <Header />
        <main className="workspace-content">
          <Suspense fallback={<div className="view-loading">Loading…</div>}>
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'session' && <SessionView />}
            {activeView === 'results' && <ResultsView />}
            {activeView === 'bank' && <QuestionBankView />}
            {activeView === 'admin' && <AdminPortalView />}
          </Suspense>
        </main>
        <Footer />
      </div>

      <ConfirmModal />
      <ShortcutsModal />
      <DataBackupModal />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ExamProvider>
      <AppLayout />
    </ExamProvider>
  );
}
