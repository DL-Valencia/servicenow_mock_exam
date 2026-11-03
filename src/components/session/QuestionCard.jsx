import React, { useMemo, useState, useEffect } from 'react';
import { useExam } from '../../context/ExamContext';
import { isQuestionAnswerCorrect } from '../../utils/examHelpers';
import StudyNotesBox from './StudyNotesBox';

export default function QuestionCard() {
  const {
    activeExam,
    currentSession,
    currentQIndex,
    handleOptionClick,
    handleMatchingSelect,
    clearCurrentSelection,
    checkAnswer,
    prevQuestion,
    nextQuestion,
    confirmFinishExam,
    setShortcutsModalOpen
  } = useExam();

  // Drag & Drop state for Matching questions
  const [draggedItem, setDraggedItem] = useState(null); // { targetText, fromLabel: string | null }
  const [dragOverSlot, setDragOverSlot] = useState(null); // pair.label | 'POOL' | null
  const [pickedChoice, setPickedChoice] = useState(null); // click-to-drop support: targetText | null

  // Reset drag state when question changes
  useEffect(() => {
    setDraggedItem(null);
    setDragOverSlot(null);
    setPickedChoice(null);
  }, [currentQIndex, currentSession?.examId]);

  if (!currentSession) return null;

  const q = currentSession.questions[currentQIndex];
  const total = currentSession.questions.length;
  const userSelected = currentSession.userAnswers[currentQIndex] || [];
  const isChecked = !!currentSession.checked[currentQIndex];
  const isStudy = currentSession.mode === 'study';
  const isLocked = isChecked && isStudy;

  const isMatching = Boolean(q.isMatching && Array.isArray(q.matchingPairs));
  const correctOptions = q.options.filter((o) => o.isCorrect);
  const correctCount = correctOptions.length;
  const isMulti = !isMatching && (q.isMultiple || correctCount > 1);
  const isAllCorrect = isQuestionAnswerCorrect(q, userSelected);
  const correctLabels = correctOptions.map((o) => o.label).join(', ');
  const examCode = currentSession.examCode || activeExam?.code || 'Exam';

  // Available target choices for matching questions
  const matchingTargets = useMemo(() => {
    if (!isMatching) return [];
    if (Array.isArray(q.matchingTargets) && q.matchingTargets.length > 0) {
      return q.matchingTargets;
    }
    return q.matchingPairs.map((p) => p.answer);
  }, [isMatching, q]);

  const getUserMatchForLabel = (label) => {
    const prefix = `${label}:`;
    const found = userSelected.find((entry) => entry.startsWith(prefix));
    return found ? found.slice(prefix.length) : '';
  };

  // Determine which choices are currently assigned to a slot vs remaining in the bottom pool
  const assignedTargetsSet = useMemo(() => {
    if (!isMatching) return new Set();
    const set = new Set();
    q.matchingPairs.forEach((p) => {
      const m = getUserMatchForLabel(p.label);
      if (m) set.add(m);
    });
    return set;
  }, [isMatching, q, userSelected]);

  const unassignedTargets = useMemo(() => {
    return matchingTargets.filter((t) => !assignedTargetsSet.has(t));
  }, [matchingTargets, assignedTargetsSet]);

  // Drag & Drop handlers
  const handleDragStartChoice = (e, targetText, fromLabel = null) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    setDraggedItem({ targetText, fromLabel });
    setPickedChoice(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', targetText);
  };

  const handleDragEndChoice = () => {
    setDraggedItem(null);
    setDragOverSlot(null);
  };

  const handleSlotDragOver = (e, slotLabel) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotLabel) {
      setDragOverSlot(slotLabel);
    }
  };

  const handleSlotDragLeave = (slotLabel) => {
    if (dragOverSlot === slotLabel) {
      setDragOverSlot(null);
    }
  };

  const handleSlotDrop = (e, slotLabel) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (isLocked) return;

    const targetText = draggedItem?.targetText || e.dataTransfer.getData('text/plain');
    const fromLabel = draggedItem?.fromLabel || null;
    if (targetText) {
      handleMatchingSelect(slotLabel, targetText, fromLabel);
    }
    setDraggedItem(null);
    setPickedChoice(null);
  };

  const handlePoolDrop = (e) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (isLocked) return;
    if (draggedItem?.fromLabel) {
      handleMatchingSelect(draggedItem.fromLabel, '');
    }
    setDraggedItem(null);
  };

  const handleSlotClick = (slotLabel) => {
    if (isLocked) return;
    if (pickedChoice) {
      handleMatchingSelect(slotLabel, pickedChoice);
      setPickedChoice(null);
    }
  };

  return (
    <div className="question-card">
      <div className="q-top-row">
        <div className="q-tags">
          <span className="tag-badge">#{q.id}</span>
          {(q.tags || [examCode]).map((t) => (
            <span key={t} className="tag-badge">
              {t}
            </span>
          ))}
          {q.source && (
            <span
              className="tag-badge"
              style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              {q.source}
            </span>
          )}
        </div>

        <div className="q-type-badge">
          {isMatching
            ? `🔗 Drag & Drop Matching (${q.matchingPairs.length} Pairs)`
            : isMulti
            ? `Multiple Choice (Choose ${correctCount})`
            : 'Single Choice (Choose 1)'}
        </div>
      </div>

      <div className="question-text">{q.question}</div>

      {/* MATCHING QUESTION DRAG-AND-DROP UI */}
      {isMatching ? (
        <div className="matching-workspace">
          {/* TOP: DESCRIPTIONS & DROP SLOTS */}
          <div className="matching-list">
            {q.matchingPairs.map((pair) => {
              const chosenTarget = getUserMatchForLabel(pair.label);
              const isPairCorrect = chosenTarget === pair.answer;
              const isDragOver = dragOverSlot === pair.label;

              let rowClass = 'matching-row';
              if (chosenTarget) rowClass += ' selected';
              if (isDragOver) rowClass += ' drag-over';
              if (isLocked) {
                rowClass += isPairCorrect ? ' correct' : ' incorrect';
              }

              return (
                <div key={pair.label} className={rowClass}>
                  <div className="matching-prompt-side">
                    <div className="opt-letter">{pair.label}</div>
                    <div className="matching-prompt-text">{pair.prompt}</div>
                  </div>

                  <div className="matching-arrow-divider">→</div>

                  <div
                    className={`matching-dropzone ${chosenTarget ? 'filled' : 'empty'} ${
                      isDragOver ? 'drag-over' : ''
                    } ${pickedChoice && !isLocked ? 'ready-to-place' : ''}`}
                    onDragOver={(e) => handleSlotDragOver(e, pair.label)}
                    onDragLeave={() => handleSlotDragLeave(pair.label)}
                    onDrop={(e) => handleSlotDrop(e, pair.label)}
                    onClick={() => handleSlotClick(pair.label)}
                  >
                    {chosenTarget ? (
                      <div
                        className="matching-placed-chip"
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStartChoice(e, chosenTarget, pair.label)}
                        onDragEnd={handleDragEndChoice}
                        title={
                          isLocked
                            ? chosenTarget
                            : 'Drag to another slot to swap, or click ✕ to return below'
                        }
                      >
                        <span className="drag-grip-icon">⠿</span>
                        <span className="placed-chip-text">{chosenTarget}</span>
                        {!isLocked && (
                          <button
                            type="button"
                            className="placed-chip-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchingSelect(pair.label, '');
                            }}
                            title="Remove and return to choices below"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="matching-drop-placeholder">
                        {pickedChoice
                          ? `Click here to place "${pickedChoice}"`
                          : 'Drag a choice from below here'}
                      </div>
                    )}

                    {isLocked && (
                      <div className="matching-feedback-inline">
                        {isPairCorrect ? (
                          <span className="match-status-ok">✓ Correct Match</span>
                        ) : (
                          <span className="match-status-err">
                            ✕ Correct match: <strong>{pair.answer}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTTOM: DRAGGABLE CHOICES POOL */}
          <div
            className={`matching-pool-container ${dragOverSlot === 'POOL' ? 'drag-over' : ''}`}
            onDragOver={(e) => handleSlotDragOver(e, 'POOL')}
            onDragLeave={() => handleSlotDragLeave('POOL')}
            onDrop={handlePoolDrop}
          >
            <div className="matching-pool-header">
              <span>
                🎯 Available Choices Pool{' '}
                <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                  (Drag any choice into a slot above, or click a choice then click a slot)
                </span>
              </span>
              <span className="matching-pool-count">
                {unassignedTargets.length} of {matchingTargets.length} remaining
              </span>
            </div>

            {unassignedTargets.length === 0 ? (
              <div className="matching-pool-empty">
                ✓ All choices have been placed in the slots above.
                {!isLocked && (
                  <span>
                    {' '}
                    You can still drag items between slots to swap them, or drag an item back here
                    to unassign it.
                  </span>
                )}
              </div>
            ) : (
              <div className="matching-pool-grid">
                {unassignedTargets.map((targetOpt, idx) => {
                  const isPicked = pickedChoice === targetOpt;
                  const isBeingDragged =
                    draggedItem?.targetText === targetOpt && !draggedItem?.fromLabel;

                  return (
                    <div
                      key={idx}
                      className={`matching-pool-chip ${isPicked ? 'picked' : ''} ${
                        isBeingDragged ? 'dragging' : ''
                      }`}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStartChoice(e, targetOpt, null)}
                      onDragEnd={handleDragEndChoice}
                      onClick={() => {
                        if (isLocked) return;
                        setPickedChoice((prev) => (prev === targetOpt ? null : targetOpt));
                      }}
                    >
                      <span className="drag-grip-icon">⠿</span>
                      <span className="pool-chip-text">{targetOpt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STANDARD SINGLE / MULTIPLE CHOICE OPTIONS */
        <div className="options-list">
          {q.options.map((opt) => {
            const isSelected = userSelected.includes(opt.label);
            let optClass = 'option-item';
            if (isSelected) optClass += ' selected';

            let showStatus = false;
            if (isChecked && isStudy) {
              optClass += ' locked';
              if (opt.isCorrect) {
                optClass += ' correct';
                showStatus = true;
              } else if (isSelected && !opt.isCorrect) {
                optClass += ' incorrect';
                showStatus = true;
              }
            }

            return (
              <div
                key={opt.label}
                className={optClass}
                onClick={() => handleOptionClick(opt.label, q)}
              >
                <div className="opt-letter">{opt.label}</div>
                <div className="opt-text">{opt.text}</div>
                {showStatus && (
                  <div className="opt-status-icon">{opt.isCorrect ? '✓' : '✕'}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isChecked && isStudy && (
        <div className={`feedback-box ${isAllCorrect ? 'correct' : 'incorrect'}`}>
          <div className="feedback-title">
            {isAllCorrect ? '✓ Correct Answer!' : '✕ Incorrect'}
          </div>
          <div className="feedback-explanation">
            {!isMatching && <strong>Correct Answer(s): Option {correctLabels}</strong>}
            <div style={{ marginTop: isMatching ? 0 : '0.4rem' }}>
              {q.explanation
                ? q.explanation
                : `Refer to official ${examCode} guidelines and documentation for detailed concepts.`}
            </div>
          </div>
        </div>
      )}

      <div className="q-controls">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            disabled={currentQIndex === 0}
            onClick={prevQuestion}
          >
            ← Prev
          </button>
          <button
            className="btn btn-outline"
            disabled={currentQIndex === total - 1}
            onClick={nextQuestion}
          >
            Next →
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
            onClick={clearCurrentSelection}
            title="Clear Selection (C)"
          >
            Clear
          </button>
          <span
            className="kbd-hint"
            onClick={() => setShortcutsModalOpen(true)}
            title="View Keyboard Shortcuts"
          >
            ⌨️ Shortcuts (?)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isStudy ? (
            <button className="btn btn-secondary" onClick={checkAnswer}>
              Check Answer
            </button>
          ) : (
            <button className="btn btn-primary" onClick={confirmFinishExam}>
              Finish & Submit Exam
            </button>
          )}
        </div>
      </div>

      <StudyNotesBox questionId={q.id} />
    </div>
  );
}
