import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function ShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen } = useExam();
  if (!shortcutsModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setShortcutsModalOpen(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Keyboard Shortcuts</h3>
        <p className="modal-desc">
          Speed through your CAD mock exam questions with intuitive keyboard controls:
        </p>
        <div className="shortcuts-grid">
          <div className="shortcut-row">
            <span>Select Options</span>
            <div>
              <span className="kbd-badge">1-5</span> / <span className="kbd-badge">A-E</span>
            </div>
          </div>
          <div className="shortcut-row">
            <span>Next Question</span>
            <div>
              <span className="kbd-badge">→</span> / <span className="kbd-badge">N</span>
            </div>
          </div>
          <div className="shortcut-row">
            <span>Previous Question</span>
            <div>
              <span className="kbd-badge">←</span> / <span className="kbd-badge">P</span>
            </div>
          </div>
          <div className="shortcut-row">
            <span>Check Answer</span>
            <span className="kbd-badge">Enter</span>
          </div>
          <div className="shortcut-row">
            <span>Flag for Review</span>
            <span className="kbd-badge">F</span>
          </div>
          <div className="shortcut-row">
            <span>Star / Bookmark</span>
            <span className="kbd-badge">B</span>
          </div>
          <div className="shortcut-row">
            <span>Clear Selection</span>
            <span className="kbd-badge">C</span>
          </div>
          <div className="shortcut-row">
            <span>Close Modal</span>
            <span className="kbd-badge">Esc</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => setShortcutsModalOpen(false)}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

