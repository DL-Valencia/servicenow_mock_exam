import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function PracticeModesGrid() {
  const {
    activeExam,
    questions,
    dashboardStats,
    marathonShuffle,
    setMarathonShuffle,
    startExam,
    startStudy,
    startMistakesPractice,
    startStarredPractice
  } = useExam();

  const totalQs = questions.length;
  const code = activeExam?.code || 'EXAM';
  const timedCount = Math.min(60, totalQs);
  const quickCount = Math.min(20, totalQs);
  const coveragePct = totalQs > 0 ? Math.round((dashboardStats.totalAnswered / totalQs) * 100) : 0;

  return (
    <section className="dashboard-section-block">
      <h2 className="section-title">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {code} Study & Practice Modes
      </h2>

      <div className="modes-grid">
        {/* MODE: REAL EXAM SIMULATOR */}
        <div
          className="mode-card"
          onClick={() =>
            startExam(timedCount, `Timed ${code} Exam Simulator (${timedCount} Qs)`, 90)
          }
        >
          <div className="mode-card-body">
            <span className="mode-badge primary">⏱️ Exam Simulation</span>
            <h3>Timed {timedCount}-Q Exam</h3>
            <p>
              {timedCount} questions randomized from all {totalQs} {code} questions, 90 minutes
              strict countdown timer, 70% passing grade threshold. Mimics the real certification
              exam experience.
            </p>
          </div>
          <div className="mode-footer">
            <span>{timedCount} Questions · 90 Mins</span>
            <span className="btn btn-primary btn-sm">Launch</span>
          </div>
        </div>

        {/* MODE: QUICK 20 DRILL */}
        <div
          className="mode-card"
          onClick={() => startStudy(quickCount, 'random', `${code} Quick ${quickCount} Workout`)}
        >
          <div className="mode-card-body">
            <span className="mode-badge success">⚡ Quick Study</span>
            <h3>Quick {quickCount} Drill</h3>
            <p>
              {quickCount} random {code} questions with instant answers, explanations, and checks.
              Ideal for rapid revision between study sessions.
            </p>
          </div>
          <div className="mode-footer">
            <span>{quickCount} Questions · Instant Feedback</span>
            <span className="btn btn-secondary btn-sm">Start Drill</span>
          </div>
        </div>

        {/* MODE: MISTAKES DRILL */}
        <div className="mode-card" onClick={() => startMistakesPractice()}>
          <div className="mode-card-body">
            <span className="mode-badge danger">⚠️ Targeted Repair</span>
            <h3>Mistakes Bank</h3>
            <p>
              Target only the {code} questions you have answered incorrectly in previous study
              sessions until you achieve 100% mastery.
            </p>
          </div>
          <div className="mode-footer">
            <span>{dashboardStats.missedCount} Questions in Bank</span>
            <span className="btn btn-secondary btn-sm">Review Missed</span>
          </div>
        </div>

        {/* MODE: STARRED ITEMS */}
        <div className="mode-card" onClick={() => startStarredPractice()}>
          <div className="mode-card-body">
            <span className="mode-badge warning">⭐ Bookmarked</span>
            <h3>Starred Questions</h3>
            <p>
              Revisit all {code} questions you explicitly bookmarked for later review and
              reinforcement before sitting the official exam.
            </p>
          </div>
          <div className="mode-footer">
            <span>{dashboardStats.starredCount} Bookmarked Questions</span>
            <span className="btn btn-secondary btn-sm">Review Starred</span>
          </div>
        </div>

        {/* MODE: ALL ITEMS MARATHON (FULL-WIDTH FEATURED CARD) */}
        <div
          className="mode-card mode-card-featured"
          onClick={() =>
            startStudy(
              totalQs,
              'all',
              `${code} All ${totalQs} Questions Marathon`,
              marathonShuffle
            )
          }
        >
          <div className="marathon-top-layout">
            <div className="mode-card-body">
              <div className="marathon-badges-row">
                <span className="mode-badge success" style={{ marginBottom: 0 }}>
                  🏆 Ultimate Marathon
                </span>
                <span className="marathon-accuracy-pill">
                  🎯 Accuracy: <strong>{dashboardStats.accuracy}%</strong> (
                  {dashboardStats.totalAnswered}/{totalQs} Answered · {coveragePct}%)
                </span>
              </div>

              <h3 style={{ marginTop: '0.65rem' }}>
                All {totalQs} Items Marathon ({code})
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Practice all {totalQs} questions in this {code} module with instant explanations
                and study note recording. Activate Shuffle Mode to randomize both question order
                and answer choices.
              </p>

              <div className="marathon-progress-track">
                <div
                  className="marathon-progress-fill"
                  style={{ width: `${dashboardStats.accuracy}%` }}
                />
              </div>
            </div>

            <div
              className="marathon-controls-box"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={`shuffle-toggle-btn ${marathonShuffle ? 'active' : ''}`}
                onClick={() => setMarathonShuffle((prev) => !prev)}
                title="Shuffle both questions and their answer choices to avoid memory patterns"
              >
                <span>🔀 Shuffle Qs & Choices</span>
                <span className="shuffle-status-pill">
                  {marathonShuffle ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              <div className="marathon-action-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    startStudy(totalQs, 'all', `${code} All ${totalQs} Questions Marathon`, false)
                  }
                >
                  Standard Order
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setMarathonShuffle(true);
                    startStudy(
                      totalQs,
                      'all',
                      `${code} All ${totalQs} Questions Marathon (Shuffled)`,
                      true
                    );
                  }}
                >
                  🔀 Start Shuffled Marathon
                </button>
              </div>
            </div>
          </div>

          <div className="mode-footer">
            <span>
              All {totalQs} Questions ·{' '}
              {marathonShuffle
                ? 'Shuffled Questions & Rearranged Answer Choices Active'
                : 'Sequential Order (Click Shuffle to randomize Qs & Choices)'}
            </span>
            <span className="marathon-accuracy-text">
              Overall Accuracy: <strong>{dashboardStats.accuracy}%</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
