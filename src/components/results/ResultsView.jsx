import React from 'react';
import { useExam } from '../../context/ExamContext';
import ResultsReviewList from './ResultsReviewList';

export default function ResultsView() {
  const {
    activeExam,
    lastExamResults,
    setResultsReviewFilter,
    retakeCurrentExam,
    showView,
    goHomeCatalog
  } = useExam();

  if (!lastExamResults) return null;

  const { passed, pct, correct, incorrect, unanswered, total, timeStr, domainStats, examCode } =
    lastExamResults;
  const code = examCode || activeExam?.code || 'Exam';
  const sortedDomains = Object.keys(domainStats || {}).sort();

  const handleReviewFilter = (filter) => {
    setResultsReviewFilter(filter);
  };

  return (
    <div className="view-animate">
      <div className="results-card">
        <div className={`results-badge ${passed ? 'pass' : 'fail'}`}>
          {passed ? `🎉 ${code} Exam Passed` : `❌ Needs Improvement (${code} Failed)`}
        </div>

        <div className="score-big">{pct}%</div>
        <div className="score-subtitle">
          {correct} of {total} correct · Required: 70% to Pass
        </div>

        <div className="results-stats-row">
          <div className="res-stat">
            <div className="val">{timeStr}</div>
            <div className="lbl">Time Taken</div>
          </div>
          <div className="res-stat">
            <div className="val" style={{ color: 'var(--sn-green)' }}>
              {correct}
            </div>
            <div className="lbl">Correct</div>
          </div>
          <div className="res-stat">
            <div className="val" style={{ color: 'var(--danger)' }}>
              {incorrect}
            </div>
            <div className="lbl">Incorrect</div>
          </div>
          <div className="res-stat">
            <div className="val">{unanswered}</div>
            <div className="lbl">Unanswered</div>
          </div>
        </div>

        <div className="domain-report">
          <div className="domain-report-title">Performance by {code} Learning Domain</div>
          <table className="domain-report-table">
            <thead>
              <tr
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase'
                }}
              >
                <th style={{ textAlign: 'left' }}>Learning Domain</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedDomains.map((tag) => {
                const d = domainStats[tag];
                const dPct = Math.round((d.correct / d.total) * 100);
                const isDomainPass = dPct >= 70;
                return (
                  <tr key={tag}>
                    <td style={{ fontWeight: 600 }}>{tag}</td>
                    <td style={{ textAlign: 'center' }}>
                      {d.correct}/{d.total} ({dPct}%)
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className={`mode-badge ${isDomainPass ? 'success' : 'danger'}`}
                        style={{ margin: 0 }}
                      >
                        {isDomainPass ? 'Proficient' : 'Needs Review'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="results-actions">
          <button className="btn btn-primary" onClick={() => handleReviewFilter('all')}>
            Review All Questions
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleReviewFilter('wrong')}
          >
            Review Mistakes Only
          </button>
          <button className="btn btn-secondary" onClick={retakeCurrentExam}>
            Retake Exam
          </button>
          <button className="btn btn-outline" onClick={() => showView('dashboard')}>
            {code} Dashboard
          </button>
          <button className="btn btn-outline" onClick={goHomeCatalog}>
            All Exams Catalog
          </button>
        </div>
      </div>

      <ResultsReviewList />
    </div>
  );
}
