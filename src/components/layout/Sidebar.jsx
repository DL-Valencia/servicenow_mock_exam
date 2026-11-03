import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function Sidebar() {
  const {
    savedExamsList,
    removeExamFromDashboard,
    statsByExam,
    activeExam,
    selectExam,
    goHomeCatalog,
    questions,
    activeView,
    showView,
    currentSession,
    dashboardStats,
    startExam,
    startStudy,
    startMistakesPractice,
    startStarredPractice,
    sidebarOpen,
    setSidebarOpen
  } = useExam();

  const totalQs = questions.length;
  const masteryPct = totalQs > 0 ? Math.round((dashboardStats.totalAnswered / totalQs) * 100) : 0;
  const timedCount = Math.min(60, totalQs);
  const quickCount = Math.min(20, totalQs);

  return (
    <>
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" onClick={goHomeCatalog}>
          <div className="brand-logo">{activeExam ? activeExam.code.slice(0, 3) : 'SN'}</div>
          <div className="brand-text">
            <h1>
              ServiceNow <span className="badge">{activeExam ? activeExam.code : 'Exam Hub'}</span>
            </h1>
            <p>
              {activeExam
                ? `${totalQs} Questions · ${activeExam.title}`
                : `${savedExamsList.length} Saved Exam Module${savedExamsList.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* NAVIGATION */}
          <div>
            <div className="sidebar-section-label">Navigation</div>
            <div className="sidebar-menu">
              <button
                className={`sidebar-link ${
                  activeView === 'dashboard' && !activeExam ? 'active' : ''
                }`}
                onClick={goHomeCatalog}
              >
                <span className="sidebar-link-left">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Search & My Exams
                </span>
                <span className="sidebar-pill">{savedExamsList.length}</span>
              </button>

              {activeExam && (
                <>
                  <button
                    className={`sidebar-link ${
                      activeView === 'dashboard' && activeExam ? 'active' : ''
                    }`}
                    onClick={() => showView('dashboard')}
                  >
                    <span className="sidebar-link-left">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      {activeExam.code} Dashboard
                    </span>
                  </button>

                  <button
                    className={`sidebar-link ${activeView === 'bank' ? 'active' : ''}`}
                    onClick={() => showView('bank')}
                  >
                    <span className="sidebar-link-left">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      {activeExam.code} Question Bank
                    </span>
                    <span className="sidebar-pill">{totalQs}</span>
                  </button>
                </>
              )}

              {currentSession && (
                <button
                  className={`sidebar-link ${activeView === 'session' ? 'active' : ''}`}
                  onClick={() => showView('session')}
                >
                  <span className="sidebar-link-left">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Active Session
                  </span>
                  <span className="sidebar-pill">{currentSession.questions.length} Qs</span>
                </button>
              )}
            </div>
          </div>

          {/* SAVED EXAM MODULES SWITCHER */}
          <div>
            <div className="sidebar-section-label">My Exam Modules</div>
            <div className="sidebar-menu">
              {savedExamsList.length === 0 ? (
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--text-subtle)',
                    padding: '0.35rem 0.65rem',
                    lineHeight: 1.4
                  }}
                >
                  No modules saved yet. Search on Home to add an exam.
                </div>
              ) : (
                savedExamsList.map((ex) => {
                  const isSelected = activeExam?.id === ex.id && activeView !== 'admin';
                  const st = statsByExam[ex.id];
                  return (
                    <div key={ex.id} className="sidebar-saved-exam-row">
                      <button
                        className={`sidebar-link ${isSelected ? 'active' : ''}`}
                        onClick={() => selectExam(ex.id, 'dashboard')}
                        title={ex.title}
                      >
                        <span className="sidebar-link-left">
                          <span>📘</span>
                          <span>{ex.code}</span>
                        </span>
                        <span className="sidebar-pill">
                          {st?.totalAnswered || 0}/{ex.questions.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="sidebar-remove-exam-btn"
                        title={`Remove ${ex.code} from My Exam Modules`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExamFromDashboard(ex.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK LAUNCH FOR ACTIVE EXAM */}
          {activeExam && (
            <div>
              <div className="sidebar-section-label">{activeExam.code} Quick Launch</div>
              <div className="sidebar-menu">
                <button
                  className="sidebar-link"
                  onClick={() =>
                    startExam(
                      timedCount,
                      `Timed ${activeExam.code} Exam Simulator (${timedCount} Qs)`,
                      90
                    )
                  }
                >
                  <span className="sidebar-link-left">
                    <span>⏱️</span>
                    Timed {timedCount}-Q Exam
                  </span>
                  <span className="sidebar-pill">90m</span>
                </button>

                <button
                  className="sidebar-link"
                  onClick={() =>
                    startStudy(quickCount, 'random', `${activeExam.code} Quick ${quickCount} Workout`)
                  }
                >
                  <span className="sidebar-link-left">
                    <span>⚡</span>
                    Quick {quickCount} Drill
                  </span>
                  <span className="sidebar-pill">{quickCount} Qs</span>
                </button>

                <button className="sidebar-link" onClick={() => startMistakesPractice()}>
                  <span className="sidebar-link-left">
                    <span>⚠️</span>
                    Mistakes Bank
                  </span>
                  <span className="sidebar-pill">{dashboardStats.missedCount}</span>
                </button>

                <button className="sidebar-link" onClick={() => startStarredPractice()}>
                  <span className="sidebar-link-left">
                    <span>⭐</span>
                    Starred Questions
                  </span>
                  <span className="sidebar-pill">{dashboardStats.starredCount}</span>
                </button>

                <button
                  className="sidebar-link"
                  onClick={() =>
                    startStudy(
                      totalQs,
                      'all',
                      `${activeExam.code} All ${totalQs} Questions Marathon`
                    )
                  }
                >
                  <span className="sidebar-link-left">
                    <span>🏆</span>
                    All {totalQs} Marathon
                  </span>
                  <span className="sidebar-pill">{totalQs}</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {activeExam && (
          <div className="sidebar-footer">
            <div className="sidebar-mastery-card">
              <div className="sidebar-mastery-top">
                <span>{activeExam.code} Coverage</span>
                <span style={{ color: 'var(--primary)' }}>{masteryPct}%</span>
              </div>
              <div
                className="progress-bar-container"
                style={{ maxWidth: '100%', height: '6px' }}
              >
                <div
                  className="progress-bar-fill"
                  style={{ width: `${masteryPct}%` }}
                />
              </div>
              <div className="sidebar-mastery-sub">
                <span>
                  {dashboardStats.totalAnswered} / {totalQs} Answered
                </span>
                <span>{dashboardStats.accuracy}% Accuracy</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
