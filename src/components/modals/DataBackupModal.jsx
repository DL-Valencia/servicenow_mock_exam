import React, { useRef } from 'react';
import { useExam } from '../../context/ExamContext';

export default function DataBackupModal() {
  const { dataModalOpen, setDataModalOpen, exportData, importDataFromFile } = useExam();
  const fileInputRef = useRef(null);

  if (!dataModalOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importDataFromFile(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setDataModalOpen(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Manage Study Data</h3>
        <p className="modal-desc">
          Export your answer history, personal notes, exam attempts, and bookmarks to a JSON file,
          or restore from a previously exported backup.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card-subtle)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Export Progress Backup
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '0.75rem'
              }}
            >
              Download a JSON file containing all your CAD mock exam answers, scores, and personal
              study notes.
            </p>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem' }}
              onClick={exportData}
            >
              📥 Download Backup (.json)
            </button>
          </div>

          <div
            style={{
              background: 'var(--bg-card-subtle)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Import Progress Backup
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '0.75rem'
              }}
            >
              Restore your progress and notes from a previously saved JSON file.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.82rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              📤 Select Backup File to Restore
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => setDataModalOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

