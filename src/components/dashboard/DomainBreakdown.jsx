import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function DomainBreakdown() {
  const { activeExam, dashboardStats, startTopicPractice } = useExam();
  const sortedTopics = Object.keys(dashboardStats.topicCounts).sort();
  const code = activeExam?.code || 'Exam';

  if (sortedTopics.length === 0) return null;

  return (
    <section className="topics-section">
      <div className="topics-section-header">
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Study by {code} Learning Domains & Tags
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Filter practice sessions by domain or tag from the uploaded {code} JSON and track your
            answered progression.
          </p>
        </div>
      </div>

      <div className="topics-grid">
        {sortedTopics.map((tag) => {
          const prog = dashboardStats.domainProgress?.[tag] || {
            total: dashboardStats.topicCounts[tag] || 0,
            answered: 0,
            correct: 0,
            pctAnswered: 0,
            accuracy: 0
          };
          const isStarted = prog.answered > 0;
          const isCompleted = prog.answered === prog.total && prog.total > 0;

          return (
            <div
              key={tag}
              className={`topic-item ${isStarted ? 'topic-answered' : ''}`}
              onClick={() => startTopicPractice(tag)}
            >
              <div className="topic-item-top">
                <span className="topic-name">{tag}</span>
                <span className="topic-count">
                  {prog.answered}/{prog.total} Qs ({prog.pctAnswered}%)
                </span>
              </div>

              <div className="topic-progress-bar">
                <div
                  className="topic-progress-fill"
                  style={{ width: `${prog.pctAnswered}%` }}
                />
              </div>

              <div className="topic-item-meta">
                {isStarted ? (
                  <>
                    <span className="topic-answered-badge">
                      {isCompleted ? '✓ Completed' : `✓ Answered (${prog.answered}/${prog.total})`}
                    </span>
                    <span className="topic-accuracy-label">
                      Accuracy: <strong>{prog.accuracy}%</strong>
                    </span>
                  </>
                ) : (
                  <span className="topic-unanswered-label">
                    Not answered yet · Click to practice
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
