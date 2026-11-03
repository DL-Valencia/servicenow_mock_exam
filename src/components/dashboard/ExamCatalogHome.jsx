import React, { useMemo } from 'react';
import { useExam } from '../../context/ExamContext';

export default function ExamCatalogHome() {
  const {
    examsList,
    savedExamIds,
    savedExamsList,
    saveExamToDashboard,
    removeExamFromDashboard,
    statsByExam,
    examSearchQuery,
    setExamSearchQuery,
    selectExam,
    startExam,
    startStudy,
    startMistakesPractice,
    startStarredPractice
  } = useExam();

  const isSearching = examSearchQuery.trim().length > 0;

  // Search results from all available uploaded exams when user types a search query
  const searchResults = useMemo(() => {
    const q = examSearchQuery.toLowerCase().trim();
    if (!q) return [];

    return examsList.filter((ex) => {
      const inCode = ex.code.toLowerCase().includes(q);
      const inTitle = ex.title.toLowerCase().includes(q);
      const inCat = (ex.category || '').toLowerCase().includes(q);
      const inDesc = (ex.description || '').toLowerCase().includes(q);
      const stats = statsByExam[ex.id];
      const inTopics = Object.keys(stats?.topicCounts || {}).some((t) =>
        t.toLowerCase().includes(q)
      );
      return inCode || inTitle || inCat || inDesc || inTopics;
    });
  }, [examsList, statsByExam, examSearchQuery]);

  return (
    <div className="view-animate dashboard-stack">
      {/* HERO SEARCH BANNER */}
      <div className="catalog-hero">
        <div className="catalog-hero-top">
          <div className="catalog-hero-text">
            <span className="mode-badge primary" style={{ marginBottom: '0.5rem' }}>
              📚 ServiceNow Certification Study & Simulation Hub
            </span>
            <h2>Search & Save Your Exam Modules</h2>
            <p>
              Search for the exam you want to take below (e.g., <strong>CIS-DF</strong>,{' '}
              <strong>CAD</strong>, <strong>CSA</strong>) and save it to your dashboard. You can
              remove any module once you finish it and add it back anytime.
            </p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="catalog-search-wrapper">
          <div className="catalog-search-box">
            <svg
              className="catalog-search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="catalog-search-input"
              placeholder="Search exam modules to add to your dashboard (e.g. CIS-DF, CMDB, CAD, CSA)..."
              value={examSearchQuery}
              onChange={(e) => setExamSearchQuery(e.target.value)}
            />
            {examSearchQuery && (
              <button
                type="button"
                className="catalog-search-clear"
                onClick={() => setExamSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* LIVE SEARCH RESULTS PANEL */}
          {isSearching && (
            <div className="search-results-panel">
              <div className="search-results-header">
                <span>
                  🔎 Search Results for <strong>"{examSearchQuery}"</strong> ({searchResults.length}{' '}
                  found)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem' }}
                  onClick={() => setExamSearchQuery('')}
                >
                  Close Search
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="search-results-empty">
                  No exam modules found matching <strong>"{examSearchQuery}"</strong>.
                </div>
              ) : (
                <div className="search-results-list">
                  {searchResults.map((exam) => {
                    const isSaved = savedExamIds.includes(exam.id);
                    const stats = statsByExam[exam.id] || {};
                    const topicsCount = Object.keys(stats.topicCounts || {}).length;

                    return (
                      <div key={exam.id} className="search-result-item">
                        <div className="search-result-info">
                          <div className="exam-code-avatar" style={{ width: '42px', height: '42px', fontSize: '0.85rem' }}>
                            {exam.code.slice(0, 4)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.98rem' }}>{exam.title}</strong>
                              <span className="mode-badge primary" style={{ marginBottom: 0 }}>
                                {exam.code}
                              </span>
                              {isSaved && (
                                <span className="mode-badge success" style={{ marginBottom: 0 }}>
                                  ✓ Saved in My Exams
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                marginTop: '0.2rem',
                                display: 'flex',
                                gap: '0.6rem',
                                flexWrap: 'wrap'
                              }}
                            >
                              <span>{exam.category || 'ServiceNow'}</span>
                              <span>·</span>
                              <span>
                                <strong>{exam.questions.length}</strong> Questions
                              </span>
                              <span>·</span>
                              <span>
                                <strong>{topicsCount}</strong> Domains
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="search-result-actions">
                          {!isSaved ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => saveExamToDashboard(exam.id)}
                              >
                                📌 Save to My Exams
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  selectExam(exam.id, 'dashboard', true);
                                  setExamSearchQuery('');
                                }}
                              >
                                Open & Save →
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  selectExam(exam.id, 'dashboard', true);
                                  setExamSearchQuery('');
                                }}
                              >
                                Open Study Hub →
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => removeExamFromDashboard(exam.id)}
                                title="Remove from My Saved Exam Modules"
                              >
                                ✕ Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MY SAVED EXAM MODULES SECTION */}
      <section className="dashboard-section-block">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            My Saved Exam Modules ({savedExamsList.length})
          </h2>
          {savedExamsList.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Finished a module? Click <strong>✕ Remove Module</strong> to clear it from your
              dashboard (you can re-add it via search anytime).
            </span>
          )}
        </div>

        {savedExamsList.length === 0 ? (
          <div className="catalog-empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>📌</div>
            <h3>No Exam Modules Saved to Your Dashboard Yet</h3>
            <p style={{ maxWidth: '540px', margin: '0 auto' }}>
              Exam modules stay hidden until you search for them and save them. Use the search bar
              above to find an exam (for example, <strong>CIS-DF</strong>, <strong>CAD</strong>, or{' '}
              <strong>CSA</strong>) and click <strong>📌 Save to My Exams</strong>.
            </p>
          </div>
        ) : (
          <div className="exam-catalog-grid">
            {savedExamsList.map((exam) => {
              const stats = statsByExam[exam.id] || {
                totalQuestions: exam.questions.length,
                totalAnswered: 0,
                accuracy: 0,
                coveragePct: 0,
                missedCount: 0,
                starredCount: 0,
                topicCounts: {}
              };
              const topics = Object.keys(stats.topicCounts || {});
              const timedCount = Math.min(60, exam.questions.length);
              const quickCount = Math.min(20, exam.questions.length);

              return (
                <div key={exam.id} className="exam-module-card">
                  <div className="exam-module-top">
                    <div className="exam-module-identity" onClick={() => selectExam(exam.id)}>
                      <div className="exam-code-avatar">{exam.code.slice(0, 4)}</div>
                      <div>
                        <div className="exam-module-badges">
                          <span className="mode-badge primary" style={{ marginBottom: 0 }}>
                            {exam.code}
                          </span>
                          <span className="tag-badge">{exam.category || 'ServiceNow'}</span>
                        </div>
                        <h3 className="exam-module-title">{exam.title}</h3>
                      </div>
                    </div>

                    <div className="exam-module-utility">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => removeExamFromDashboard(exam.id)}
                        title={`Remove ${exam.code} from your dashboard (progress is kept and you can re-add it via search anytime)`}
                      >
                        ✕ Remove Module
                      </button>
                    </div>
                  </div>

                  <p className="exam-module-desc">{exam.description}</p>

                  {/* PROGRESS & STATS STRIP */}
                  <div className="exam-module-stats">
                    <div className="exam-mini-stat">
                      <span className="lbl">Questions</span>
                      <span className="val">{exam.questions.length}</span>
                    </div>
                    <div className="exam-mini-stat">
                      <span className="lbl">Answered</span>
                      <span className="val">
                        {stats.totalAnswered}/{exam.questions.length} ({stats.coveragePct}%)
                      </span>
                    </div>
                    <div className="exam-mini-stat">
                      <span className="lbl">Accuracy</span>
                      <span className="val" style={{ color: 'var(--sn-green-dark)' }}>
                        {stats.accuracy}%
                      </span>
                    </div>
                    <div className="exam-mini-stat">
                      <span className="lbl">Domains</span>
                      <span className="val">{topics.length}</span>
                    </div>
                  </div>

                  <div className="topic-progress-bar" style={{ margin: '0.2rem 0 0.6rem' }}>
                    <div
                      className="topic-progress-fill"
                      style={{ width: `${stats.coveragePct}%` }}
                    />
                  </div>

                  {/* TOPIC TAG CHIPS PREVIEW */}
                  {topics.length > 0 && (
                    <div className="exam-module-topics">
                      {topics.slice(0, 5).map((t) => (
                        <span key={t} className="tag-badge">
                          {t} ({stats.topicCounts[t]})
                        </span>
                      ))}
                      {topics.length > 5 && (
                        <span className="tag-badge">+{topics.length - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* QUICK LAUNCH 5 MODES DIRECTLY FROM THE CARD */}
                  <div className="exam-module-modes-bar">
                    <span className="modes-bar-label">Quick Launch Modes:</span>
                    <div className="modes-bar-buttons">
                      <button
                        type="button"
                        className="mode-pill-btn primary"
                        onClick={() =>
                          startExam(
                            timedCount,
                            `Timed ${exam.code} Exam (${timedCount} Qs)`,
                            90,
                            exam
                          )
                        }
                        title={`Launch Timed ${timedCount}-Q Exam Simulator (90m)`}
                      >
                        ⏱️ Timed {timedCount}-Q Exam
                      </button>

                      <button
                        type="button"
                        className="mode-pill-btn"
                        onClick={() =>
                          startStudy(
                            quickCount,
                            'random',
                            `${exam.code} Quick ${quickCount} Drill`,
                            false,
                            exam
                          )
                        }
                        title={`Start Quick ${quickCount} Random Questions Drill`}
                      >
                        ⚡ Quick {quickCount} Drill
                      </button>

                      <button
                        type="button"
                        className="mode-pill-btn"
                        onClick={() => startMistakesPractice(exam)}
                        title="Practice questions in your Mistakes Bank"
                      >
                        ⚠️ Mistakes ({stats.missedCount})
                      </button>

                      <button
                        type="button"
                        className="mode-pill-btn"
                        onClick={() => startStarredPractice(exam)}
                        title="Review bookmarked questions"
                      >
                        ⭐ Starred ({stats.starredCount})
                      </button>

                      <button
                        type="button"
                        className="mode-pill-btn"
                        onClick={() =>
                          startStudy(
                            exam.questions.length,
                            'all',
                            `${exam.code} All ${exam.questions.length} Marathon`,
                            false,
                            exam
                          )
                        }
                        title={`Practice all ${exam.questions.length} questions in sequence`}
                      >
                        🏆 All {exam.questions.length} Marathon
                      </button>
                    </div>
                  </div>

                  <div className="exam-module-footer">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => selectExam(exam.id, 'bank')}
                    >
                      📖 Browse Question Bank ({exam.questions.length})
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => selectExam(exam.id, 'dashboard')}
                    >
                      Open {exam.code} Study Hub →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
