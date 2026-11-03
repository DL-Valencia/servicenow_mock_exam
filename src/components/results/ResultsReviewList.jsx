import React from 'react';
import { useExam } from '../../context/ExamContext';
import { isQuestionAnswerCorrect } from '../../utils/examHelpers';

export default function ResultsReviewList() {
  const { currentSession, resultsReviewFilter } = useExam();

  if (!currentSession) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {currentSession.questions.map((q, idx) => {
        const userAns = currentSession.userAnswers[idx] || [];
        const isRight = userAns.length > 0 && isQuestionAnswerCorrect(q, userAns);
        const isMatching = Boolean(q.isMatching && Array.isArray(q.matchingPairs));

        if (resultsReviewFilter === 'wrong' && isRight) return null;

        return (
          <div
            key={q.id}
            className="bank-item"
            style={{
              borderLeft: isRight
                ? '4px solid var(--sn-green)'
                : '4px solid var(--danger)'
            }}
          >
            <div className="bank-item-header">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`mode-badge ${isRight ? 'success' : 'danger'}`} style={{ marginBottom: 0 }}>
                  {isRight ? 'Correct' : 'Incorrect'}
                </span>
                {isMatching && <span className="tag-badge">🔗 Matching</span>}
                {(q.tags || []).map((t) => (
                  <span key={t} className="tag-badge">
                    {t}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Q{idx + 1} of {currentSession.questions.length}
                {q.source ? ` · ${q.source}` : ''}
              </span>
            </div>

            <div className="bank-q-text">{q.question}</div>

            {isMatching ? (
              <div className="bank-options">
                {q.matchingPairs.map((pair) => {
                  const prefix = `${pair.label}:`;
                  const found = userAns.find((entry) => entry.startsWith(prefix));
                  const userTarget = found ? found.slice(prefix.length) : '(Unanswered)';
                  const pairRight = userTarget === pair.answer;

                  return (
                    <div
                      key={pair.label}
                      className={`bank-opt ${pairRight ? 'correct' : 'incorrect'}`}
                      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
                    >
                      <div>
                        <strong>[{pair.label}]</strong> {pair.prompt}
                      </div>
                      <div style={{ fontSize: '0.82rem' }}>
                        {pairRight ? (
                          <span>✓ Your Match: <strong>{userTarget}</strong></span>
                        ) : (
                          <span>
                            ✕ Your Match: <strong>{userTarget}</strong> · Correct Match:{' '}
                            <strong>{pair.answer}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bank-options">
                {q.options.map((opt) => {
                  const isUserChosen = userAns.includes(opt.label);
                  let optClass = 'bank-opt';
                  let mark = '';

                  if (opt.isCorrect) {
                    optClass += ' correct';
                    mark = ' ✓ (Correct Answer)';
                  }
                  if (isUserChosen && !opt.isCorrect) {
                    optClass += ' incorrect';
                    mark = ' ✕ (Your Answer)';
                  } else if (isUserChosen && opt.isCorrect) {
                    mark = ' ✓ (Your Answer - Correct)';
                  }

                  return (
                    <div key={opt.label} className={optClass}>
                      <strong>[{opt.label}]</strong> {opt.text} {mark}
                    </div>
                  );
                })}
              </div>
            )}

            {q.explanation && (
              <div className="bank-explanation-box">
                <strong>💡 Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
