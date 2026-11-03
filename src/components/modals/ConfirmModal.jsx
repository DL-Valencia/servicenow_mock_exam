import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function ConfirmModal() {
  const { confirmModal, closeModal, handleModalConfirm } = useExam();
  if (!confirmModal.open) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{confirmModal.title}</h3>
        <p className="modal-desc">{confirmModal.desc}</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleModalConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

