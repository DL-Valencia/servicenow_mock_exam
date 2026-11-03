import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';

export function useKeyboardShortcuts() {
  const {
    activeView,
    currentSession,
    currentQIndex,
    handleOptionClick,
    nextQuestion,
    prevQuestion,
    checkAnswer,
    toggleCurrentFlag,
    toggleCurrentStar,
    clearCurrentSelection,
    closeModal,
    setShortcutsModalOpen,
    setDataModalOpen,
    setUploadModalOpen
  } = useExam();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        setShortcutsModalOpen(false);
        setDataModalOpen(false);
        setUploadModalOpen(false);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      if (activeView !== 'session' || !currentSession) return;

      const q = currentSession.questions[currentQIndex];
      if (!q) return;

      const key = e.key.toUpperCase();

      // Letters A-H & Numbers 1-8 (skip for matching questions which use dropdowns)
      if (!q.isMatching) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        if (letters.includes(key)) {
          const opt = q.options.find((o) => o.label === key);
          if (opt) {
            e.preventDefault();
            handleOptionClick(key, q);
          }
        }

        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= q.options.length) {
          e.preventDefault();
          const opt = q.options[num - 1];
          if (opt) handleOptionClick(opt.label, q);
        }
      }

      // Navigation
      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        prevQuestion();
      }

      // Enter for Check Answer
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSession.mode === 'study') {
          checkAnswer();
        }
      }

      // F for Flag in exam
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleCurrentFlag();
      }

      // B for Star / Bookmark
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleCurrentStar();
      }

      // C for Clear Selection
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        clearCurrentSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeView,
    currentSession,
    currentQIndex,
    handleOptionClick,
    nextQuestion,
    prevQuestion,
    checkAnswer,
    toggleCurrentFlag,
    toggleCurrentStar,
    clearCurrentSelection,
    closeModal,
    setShortcutsModalOpen,
    setDataModalOpen,
    setUploadModalOpen
  ]);
}
