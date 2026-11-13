import React, { useState } from 'react';
import { useExam } from '../../context/ExamContext';
import ExplanationContent from '../common/ExplanationContent';

export default function BankQuestionItem({ question }) {
  const { state, toggleQuestionStar, updateQuestionNote, setBankFilters } = useExam();
  const isStarred = !!state.starred[question.id];
  const historyEntry = state.history[question.id];
  const isAnswered = !!historyEntry && historyEntry.timesAnswered > 0;
  const isMatching = Boolean(question.isMatching && Array.isArray(question.matchingPairs));
  const noteText = state.notes?.[question.id] || '';
  const hasNote = String(noteText).trim().length > 0;
  const [editingNote, setEditingNote] = useState(false);

  return (
    <div className="bank-item">
      <div className="bank-item-header">
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span className="tag-badge">#{question.id}</span>
          {isMatching && (
            <span
              className="tag-badge"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                fontWeight: 700
              }}
            >
              🔗 Matching ({question.matchingPairs.length} Pairs)
            </span>
          )}
          {question.source && (
            <span
              className="tag-badge"
              style={{ color: 'var(--primary)', fontWeight: 700 }}
            >
              {question.source}
            </span>
          )}
          {(question.tags || []).map((t) => (
            <button
              key={t}
              type="button"
              className="tag-badge tag-badge-clickable"
              onClick={() => setBankFilters((prev) => ({ ...prev, topic: t }))}
              title={`Filter by ${t}`}
            >
              {t}
            </button>
          ))}
          {isAnswered && (
            <span
              className={`mode-badge ${historyEntry.lastResult ? 'success' : 'danger'}`}
              style={{ marginBottom: 0, padding: '0.15rem 0.55rem', fontSize: '0.68rem' }}
            >
              {historyEntry.lastResult ? '✓ Answered' : '⚠️ Needs Review'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{
              padding: '0.2rem 0.55rem',
              fontSize: '0.73rem',
              borderColor: hasNote ? 'var(--primary)' : undefined,
              color: hasNote ? 'var(--primary)' : undefined
            }}
            onClick={() => setEditingNote((prev) => !prev)}
            title={hasNote ? 'Edit your study note' : 'Add a personal study note'}
          >
            📝 {hasNote ? 'Edit Note' : '+ Note'}
          </button>

          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={() => toggleQuestionStar(question.id)}
            title="Star / Bookmark"
          >
            <svg
              width="15"
              height="15"
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

      <div className="bank-q-text">{question.question}</div>

      {isMatching ? (
        <div className="bank-options">
          {question.matchingPairs.map((pair) => (
            <div key={pair.label} className="bank-opt correct" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>
                <strong>[{pair.label}]</strong> {pair.prompt}
              </span>
              <span className="matching-target-pill">→ {pair.answer} ✓</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bank-options">
          {question.options.map((opt) => (
            <div
              key={opt.label}
              className={`bank-opt ${opt.isCorrect ? 'correct' : ''}`}
            >
              <strong>[{opt.label}]</strong> {opt.text} {opt.isCorrect ? ' ✓' : ''}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div className="bank-explanation-box">
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>💡 Explanation:</div>
          <ExplanationContent text={question.explanation} />
        </div>
      )}

      {(hasNote || editingNote) && (
        <div className="notes-box" style={{ marginTop: '0.75rem' }}>
          <div className="notes-label">
            <span>📝 My Personal Study Note</span>
            <span>Auto-saved</span>
          </div>
          {editingNote ? (
            <textarea
              className="notes-textarea"
              placeholder="Write your personal study note or mnemonic for this question..."
              value={noteText}
              onChange={(e) => updateQuestionNote(question.id, e.target.value)}
              autoFocus
            />
          ) : (
            <div
              style={{
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer'
              }}
              onClick={() => setEditingNote(true)}
              title="Click to edit note"
            >
              {noteText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
