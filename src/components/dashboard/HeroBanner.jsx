import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function HeroBanner() {
  const {
    activeExam,
    startExam,
    goHomeCatalog,
    removeExamFromDashboard
  } = useExam();

  if (!activeExam) return null;

  const timedCount = Math.min(60, activeExam.questions.length);

  return (
    <div className="hero-banner">
      <div className="hero-content">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.65rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: '0.28rem 0.7rem', fontSize: '0.76rem' }}
            onClick={goHomeCatalog}
          >
            ← My Exams Dashboard
          </button>
          <span className="mode-badge primary" style={{ marginBottom: 0 }}>
            {activeExam.code}
          </span>
          <span className="tag-badge">{activeExam.category || 'ServiceNow'}</span>
        </div>

        <h2>{activeExam.title}</h2>
        <p>{activeExam.description}</p>
      </div>

      <div className="hero-actions">
        <button
          className="btn btn-primary"
          style={{ padding: '0.85rem 1.75rem', fontSize: '0.96rem' }}
          onClick={() =>
            startExam(timedCount, `Real ${activeExam.code} Exam (${timedCount} Qs)`, 90)
          }
        >
          ⚡ Start {timedCount}-Q {activeExam.code} Exam
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => removeExamFromDashboard(activeExam.id)}
          title="Finished this exam? Remove it from your dashboard (you can search & add it again anytime)"
        >
          ✕ Remove from My Exams
        </button>
      </div>
    </div>
  );
}
