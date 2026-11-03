import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function Header() {
  const {
    activeExam,
    goHomeCatalog,
    isAdminAuthenticated,
    activeView,
    showView,
    currentSession,
    state,
    toggleTheme,
    setShortcutsModalOpen,
    setDataModalOpen,
    confirmReset,
    setSidebarOpen
  } = useExam();

  const getHeaderTitle = () => {
    if (activeView === 'admin') {
      return isAdminAuthenticated ? 'Admin Portal · Upload & Delete Modules' : 'Admin Portal Login';
    }
    if (activeView === 'dashboard') {
      return activeExam ? `${activeExam.code} Study Hub` : 'Exam Library & Search';
    }
    if (activeView === 'bank') {
      return activeExam
        ? `${activeExam.code} Question Bank (${activeExam.questions.length})`
        : 'Question Bank';
    }
    if (activeView === 'results') return 'Exam Performance Diagnostics';
    if (activeView === 'session' && currentSession) return currentSession.title;
    return 'ServiceNow Exam Hub';
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="icon-btn mobile-menu-btn"
          title="Open Navigation"
          onClick={() => setSidebarOpen(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-breadcrumb">
          <span
            className="muted"
            style={{ cursor: 'pointer' }}
            onClick={goHomeCatalog}
            title="Go to Exam Catalog & Search"
          >
            All Exams
          </span>
          {activeExam && activeView !== 'admin' && (
            <>
              <span className="muted">/</span>
              <span className="muted">{activeExam.code}</span>
            </>
          )}
          <span className="muted">/</span>
          <span>{getHeaderTitle()}</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="header-action-btn"
          title="Keyboard Shortcuts (?)"
          onClick={() => setShortcutsModalOpen(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="header-action-label">Shortcuts</span>
        </button>

        <button
          className="header-action-btn"
          title="Backup & Restore Data"
          onClick={() => setDataModalOpen(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="header-action-label">Backup</span>
        </button>

        <button
          className="icon-btn"
          title="Toggle Theme"
          onClick={toggleTheme}
        >
          {state.theme === 'dark' ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button
          className="icon-btn"
          title={activeExam ? `Reset ${activeExam.code} Progress` : 'Reset Progress'}
          onClick={confirmReset}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
