import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function StatsStrip() {
  const { dashboardStats } = useExam();

  return (
    <div className="stats-strip">
      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          💻
        </div>
        <div className="stat-info">
          <h3>{dashboardStats.totalAnswered}</h3>
          <p>Questions Answered</p>
        </div>
      </div>

      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ background: 'var(--sn-green-light)', color: 'var(--sn-green-dark)' }}
        >
          🎯
        </div>
        <div className="stat-info">
          <h3>{dashboardStats.accuracy}%</h3>
          <p>Overall Accuracy</p>
        </div>
      </div>

      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}
        >
          ⭐
        </div>
        <div className="stat-info">
          <h3>{dashboardStats.starredCount}</h3>
          <p>Starred For Review</p>
        </div>
      </div>

      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
        >
          ⚠️
        </div>
        <div className="stat-info">
          <h3>{dashboardStats.missedCount}</h3>
          <p>Mistakes Bank</p>
        </div>
      </div>
    </div>
  );
}

