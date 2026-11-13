import React from 'react';
import { useExam } from '../../context/ExamContext';

const PASS_MARK = 70;

function ScoreTrendChart({ attempts }) {
  const data = attempts.slice(-12);
  if (data.length < 2) return null;

  const W = 640;
  const H = 200;
  const pad = { l: 36, r: 14, t: 14, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (i) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  const points = data.map((a, i) => `${x(i)},${y(Number(a.score) || 0)}`).join(' ');
  const area = `${x(0)},${y(0)} ${points} ${x(data.length - 1)},${y(0)}`;
  const avg = Math.round(data.reduce((s, a) => s + (Number(a.score) || 0), 0) / data.length);
  const best = Math.max(...data.map((a) => Number(a.score) || 0));
  const first = Number(data[0].score) || 0;
  const last = Number(data[data.length - 1].score) || 0;
  const delta = last - first;

  return (
    <div className="trend-chart-wrap">
      <div className="trend-chart-stats">
        <span>
          Average <strong>{avg}%</strong>
        </span>
        <span>
          Best <strong>{best}%</strong>
        </span>
        <span>
          Trend{' '}
          <strong style={{ color: delta >= 0 ? 'var(--sn-green-dark)' : 'var(--danger)' }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
          </strong>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-chart"
        role="img"
        aria-label="Exam score trend over your last attempts"
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border-color)"
              strokeDasharray="3 4"
            />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" className="trend-axis">
              {v}
            </text>
          </g>
        ))}
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(PASS_MARK)}
          y2={y(PASS_MARK)}
          stroke="var(--sn-green)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
        <text x={W - pad.r} y={y(PASS_MARK) - 4} textAnchor="end" className="trend-pass-label">
          Pass {PASS_MARK}%
        </text>
        <polygon points={area} fill="url(#trendFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="trend-line"
        />
        {data.map((a, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(Number(a.score) || 0)}
            r="4.5"
            fill={a.passed ? 'var(--sn-green)' : 'var(--danger)'}
            stroke="var(--bg-card)"
            strokeWidth="2"
          >
            <title>
              {a.date} · {a.title}: {a.score}%
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

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

      <ScoreTrendChart attempts={attempts} />

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

