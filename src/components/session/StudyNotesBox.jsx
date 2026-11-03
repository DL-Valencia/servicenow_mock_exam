import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function StudyNotesBox({ questionId }) {
  const { state, updateQuestionNote } = useExam();
  const noteValue = state.notes[questionId] || '';

  return (
    <div className="notes-box">
      <label
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          display: 'block',
          marginBottom: '0.35rem'
        }}
      >
        Personal Study Note (Auto-saved)
      </label>
      <textarea
        className="notes-textarea"
        placeholder="Add your notes, syntax reminders, or key points for this CAD question..."
        value={noteValue}
        onChange={(e) => updateQuestionNote(questionId, e.target.value)}
      />
    </div>
  );
}

