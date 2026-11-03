import React from 'react';
import { useExam } from '../../context/ExamContext';
import { formatTimerDisplay, isQuestionAnswerCorrect } from '../../utils/examHelpers';

export default function SessionHeader() {
  const {
    activeExam,
    currentSession,
    currentQIndex,
    timeRemaining,
    state,
    confirmExitSession,
    toggleCurrentFlag,
    toggleCurrentStar,
    reshuffleCurrentSession,
    resetCurrentModule
  } = useExam();

  if (!currentSession) return null;

  const q = currentSession.questions[currentQIndex];
  const total = currentSession.questions.length;
  const pct = Math.round(((currentQIndex + 1) / total) * 100);
  const isStarred = !!state.starred[q?.id];
  const isFlagged = !!currentSession.flagged[currentQIndex];
  const isExam = currentSession.mode === 'exam';
  const examCode = currentSession.examCode || activeExam?.code || 'Exam';

  // Calculate live session accuracy for checked questions in Study Mode
  const checkedIndices = Object.keys(currentSession.checked || {}).filter(
    (idx) => currentSession.checked[idx]
  );
  const checkedCount = checkedIndices.length;
  let sessionCorrect = 0;
  checkedIndices.forEach((idx) => {
    const questionItem = currentSession.questions[idx];
    const ans = currentSession.userAnswers[idx] || [];
    if (questionItem && isQuestionAnswerCorrect(questionItem, ans)) {
      sessionCorrect += 1;
    }
  });
  const sessionAccuracy =
    checkedCount > 0 ? Math.round((sessionCorrect / checkedCount) * 100) : null;

  return (
    <div className="session-header">
      <div className="session-meta">
        <button
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          onClick={confirmExitSession}
        >
          ✕ Exit
        </button>
        <span
          className={`mode-badge ${isExam ? 'danger' : 'primary'}`}
          style={{ margin: 0 }}
        >
          {isExam ? `${examCode} Exam Simulator` : `${examCode} Study Mode`}
        </span>
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-muted)'
          }}
        >
          Question {currentQIndex + 1} of {total}
        </span>
        {!isExam && sessionAccuracy !== null && (
          <span className="session-accuracy-pill">
            🎯 Accuracy: <strong>{sessionAccuracy}%</strong> ({sessionCorrect}/{checkedCount})
          </span>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {!isExam && (
          <button
            className={`btn btn-outline btn-sm ${currentSession.shuffled ? 'shuffle-active-pill' : ''}`}
            onClick={reshuffleCurrentSession}
            title="Shuffle questions and rearrange answer choices to avoid memory pattern"
          >
            🔀 {currentSession.shuffled ? 'Reshuffle Qs & Choices' : 'Shuffle Qs & Choices'}
          </button>
        )}

        {!isExam && currentSession.sessionKey && (
          <button
            className="btn btn-outline btn-sm"
            onClick={resetCurrentModule}
            title="Clear saved progress for this module only"
          >
            ↺ Reset Module
          </button>
        )}

        {isExam && (
          <div className={`timer-display ${timeRemaining <= 300 ? 'low-time' : ''}`}>
            ⏱️ <span>{formatTimerDisplay(timeRemaining)}</span>
          </div>
        )}

        <button
          className="icon-btn"
          title="Flag for Review in Exam (F)"
          onClick={toggleCurrentFlag}
          style={{
            borderColor: isFlagged ? 'var(--warning)' : 'var(--border-color)',
            background: isFlagged ? 'var(--warning-light)' : 'var(--bg-card)'
          }}
        >
          <span style={{ fontSize: '1rem' }}>🚩</span>
        </button>

        <button
          className="icon-btn"
          title="Star / Bookmark (B)"
          onClick={toggleCurrentStar}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isStarred ? 'var(--warning)' : 'none'}
            stroke={isStarred ? 'var(--warning)' : 'currentColor'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
