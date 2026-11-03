import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function ExamHistoryTable() {
  const { state } = useExam();
  const attempts = state.examHistory || [];

  if (attempts.length === 0) return null;

  const recentAttempts = [...attempts].slice(-5).reverse();

  return (
    <div className="history-section">
      <h2 className="section-title">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Past Exam Attempts
      </h2>

      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Exam</th>
            <th>Score</th>
            <th>Result</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {recentAttempts.map((attempt, index) => (
            <tr key={index}>
              <td style={{ color: 'var(--text-muted)' }}>{attempt.date}</td>
              <td style={{ fontWeight: 600 }}>{attempt.title}</td>
              <td style={{ fontWeight: 700 }}>
                {attempt.score}% ({attempt.correct}/{attempt.total})
              </td>
              <td>
                <span
                  className={`mode-badge ${attempt.passed ? 'success' : 'danger'}`}
                  style={{ margin: 0 }}
                >
                  {attempt.passed ? 'PASS' : 'FAIL'}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {attempt.timeTaken}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

