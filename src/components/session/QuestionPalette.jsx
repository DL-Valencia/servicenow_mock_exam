import React from 'react';
import { useExam } from '../../context/ExamContext';
import { isQuestionAnswerCorrect } from '../../utils/examHelpers';

export default function QuestionPalette() {
  const {
    currentSession,
    currentQIndex,
    paletteFilter,
    setPaletteFilter,
    jumpToQuestion
  } = useExam();

  if (!currentSession) return null;

  const isStudy = currentSession.mode === 'study';

  return (
    <div className="palette-card">
      <div className="palette-title">
        <span>Questions Overview</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {currentSession.questions.length} Questions
        </span>
      </div>

      <div className="palette-filter-row">
        <button
          className={`pal-filter-btn ${paletteFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPaletteFilter('all')}
        >
          All
        </button>
        <button
          className={`pal-filter-btn ${paletteFilter === 'unanswered' ? 'active' : ''}`}
          onClick={() => setPaletteFilter('unanswered')}
        >
          Unanswered
        </button>
        <button
          className={`pal-filter-btn ${paletteFilter === 'flagged' ? 'active' : ''}`}
          onClick={() => setPaletteFilter('flagged')}
        >
          Flagged
        </button>
      </div>

      <div className="palette-grid">
        {currentSession.questions.map((q, idx) => {
          const userAns = currentSession.userAnswers[idx] || [];
          const isAnswered = userAns.length > 0;
          const isFlagged = !!currentSession.flagged[idx];

          if (paletteFilter === 'unanswered' && isAnswered) return null;
          if (paletteFilter === 'flagged' && !isFlagged) return null;

          let btnClass = 'pal-btn';
          if (idx === currentQIndex) btnClass += ' current';
          if (isAnswered) btnClass += ' answered';

          if (isStudy && currentSession.checked[idx]) {
            const isCorrect = isQuestionAnswerCorrect(q, userAns);
            btnClass += isCorrect ? ' correct' : ' incorrect';
          }

          if (isFlagged) btnClass += ' flagged';

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={() => jumpToQuestion(idx)}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="palette-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--primary)' }} /> Answered
        </div>
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-color)'
            }}
          />{' '}
          Pending
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--sn-green)' }} /> Correct
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--danger)' }} /> Wrong
        </div>
      </div>
    </div>
  );
}

