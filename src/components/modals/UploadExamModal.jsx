import React, { useState, useRef } from 'react';
import { useExam } from '../../context/ExamContext';
import { normalizeExamPayload } from '../../utils/examHelpers';

const SAMPLE_JSON_SNIPPET = `[
  {
    "id": 1,
    "question": "What are the characteristics or functions of ServiceNow IntegrationHub ETL? (select 2)",
    "options": [
      {
        "label": "A",
        "text": "Integrates third-party data into the CMDB or into non-CMDB tables",
        "isCorrect": true
      },
      {
        "label": "B",
        "text": "Uses the IRE to process and integrate data",
        "isCorrect": true
      },
      {
        "label": "C",
        "text": "Imports Microsoft SCCM/Intune data into the CMDB",
        "isCorrect": false
      },
      {
        "label": "D",
        "text": "Performs discovery data collection and updates the CMDB",
        "isCorrect": false
      }
    ],
    "explanation": "IntegrationHub ETL is built to bring external/third-party data into ServiceNow, landing it either in the CMDB or in supported non-CMDB tables, and it routes that data through the Identification and Reconciliation Engine (IRE) so CIs are matched and reconciled rather than blindly inserted.",
    "isMultiple": true,
    "tags": [
      "Ingest"
    ]
  }
]`;

export default function UploadExamModal() {
  const { uploadModalOpen, setUploadModalOpen, registerUploadedExam, showToast } = useExam();
  const fileInputRef = useRef(null);

  const [examCode, setExamCode] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examCategory, setExamCategory] = useState('ServiceNow Mainline');
  const [examDesc, setExamDesc] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  if (!uploadModalOpen) return null;

  const resetForm = () => {
    setExamCode('');
    setExamTitle('');
    setExamCategory('ServiceNow Mainline');
    setExamDesc('');
    setJsonText('');
    setSelectedFileName('');
    setParsedPreview(null);
    setErrorMsg('');
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    setUploadModalOpen(false);
  };

  const parseAndPreview = (rawStr, fileNameHint = '') => {
    setErrorMsg('');
    try {
      const parsed = JSON.parse(rawStr);
      // Infer code/title from filename if not already filled
      let inferredCode = examCode;
      let inferredTitle = examTitle;
      if (fileNameHint && !inferredCode) {
        const cleanName = fileNameHint.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim();
        const firstToken = cleanName.split(/\s+/)[0].toUpperCase();
        inferredCode = firstToken.length <= 10 ? firstToken : cleanName.slice(0, 8).toUpperCase();
        setExamCode(inferredCode);
      }
      if (fileNameHint && !inferredTitle) {
        const cleanName = fileNameHint.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim();
        inferredTitle =
          cleanName.length <= 5
            ? `ServiceNow ${cleanName.toUpperCase()} Mock Exam`
            : cleanName.replace(/\b\w/g, (c) => c.toUpperCase());
        setExamTitle(inferredTitle);
      }

      const norm = normalizeExamPayload(parsed, {
        code: inferredCode || parsed.code || 'EXAM',
        title: inferredTitle || parsed.title || 'Custom Mock Exam'
      });

      const tagsSet = new Set();
      let withExplanationCount = 0;
      let multiCount = 0;
      norm.questions.forEach((q) => {
        (q.tags || []).forEach((t) => tagsSet.add(t));
        if (q.explanation) withExplanationCount++;
        if (q.isMultiple) multiCount++;
      });

      setParsedPreview({
        questionCount: norm.questions.length,
        tagsCount: tagsSet.size,
        tagsList: Array.from(tagsSet).slice(0, 8),
        withExplanationCount,
        multiCount,
        rawParsed: parsed
      });
    } catch (err) {
      setParsedPreview(null);
      setErrorMsg(err.message || 'Invalid JSON format.');
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      setJsonText(content);
      parseAndPreview(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleJsonTextChange = (e) => {
    const val = e.target.value;
    setJsonText(val);
    if (val.trim()) {
      parseAndPreview(val, selectedFileName);
    } else {
      setParsedPreview(null);
      setErrorMsg('');
    }
  };

  const handleLoadSample = () => {
    setExamCode('CMDB');
    setExamTitle('ServiceNow CMDB & IntegrationHub ETL');
    setExamCategory('ServiceNow CIS');
    setExamDesc('Practice questions for IntegrationHub ETL, IRE, and CMDB ingestion.');
    setJsonText(SAMPLE_JSON_SNIPPET);
    parseAndPreview(SAMPLE_JSON_SNIPPET, 'CMDB.json');
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_JSON_SNIPPET);
    showToast('📋 Sample JSON format copied to clipboard!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jsonText.trim()) {
      setErrorMsg('Please upload a .json file or paste your JSON array of questions.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const rawParsed = JSON.parse(jsonText);
      const code = (examCode || 'EXAM').trim().toUpperCase();
      const title = (examTitle || `${code} Mock Exam`).trim();
      await registerUploadedExam(rawParsed, {
        id: code.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
        code,
        title,
        category: examCategory.trim() || 'ServiceNow Certification',
        description: examDesc.trim()
      });
      resetForm();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save exam JSON.');
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-box upload-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="upload-modal-header">
          <div>
            <span className="mode-badge primary" style={{ marginBottom: '0.35rem' }}>
              📂 JSON Exam Importer
            </span>
            <h3 className="modal-title" style={{ marginBottom: '0.15rem' }}>
              Upload & Save Exam Module (.json)
            </h3>
            <p className="modal-desc" style={{ marginBottom: 0 }}>
              Upload a JSON question file (e.g., <strong>CSA</strong>, <strong>CAD</strong>,{' '}
              <strong>CIS-ITSM</strong>, <strong>CMDB</strong>). It will be saved directly to{' '}
              <code>src/data/exams/</code> and indexed for search.
            </p>
          </div>
          <button className="icon-btn" onClick={handleClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="upload-meta-grid">
            <div className="form-group">
              <label className="form-label">
                Exam Code / Short Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., CSA, CAD, CIS-DF"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category / Track</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., ServiceNow Mainline"
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value)}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">
                Full Exam Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., ServiceNow Certified System Administrator (CSA)"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Description (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Short summary of domains or topics covered in this exam..."
                value={examDesc}
                onChange={(e) => setExamDesc(e.target.value)}
              />
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${
              parsedPreview ? 'valid' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="dropzone-icon">📄</div>
            <div className="dropzone-text">
              {selectedFileName ? (
                <>
                  <strong>{selectedFileName}</strong> selected · Click or drag another file to
                  replace
                </>
              ) : (
                <>
                  <strong>Click to choose a .json file</strong> or drag & drop it here
                </>
              )}
            </div>
            <span className="dropzone-sub">
              Saves automatically to <code>src/data/exams/{(examCode || 'exam').toLowerCase()}.json</code>
            </span>
          </div>

          {/* Live Validation Preview Banner */}
          {parsedPreview && (
            <div className="upload-preview-banner">
              <div className="upload-preview-top">
                <span className="preview-status-ok">
                  ✓ Valid Exam JSON ({parsedPreview.questionCount} Questions)
                </span>
                <span className="preview-stats-pills">
                  <span>{parsedPreview.multiCount} Multi-Select</span>
                  <span>·</span>
                  <span>{parsedPreview.withExplanationCount} with Explanations</span>
                  <span>·</span>
                  <span>{parsedPreview.tagsCount} Tags/Domains</span>
                </span>
              </div>
              {parsedPreview.tagsList.length > 0 && (
                <div className="upload-preview-tags">
                  {parsedPreview.tagsList.map((t) => (
                    <span key={t} className="tag-badge">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && <div className="upload-error-box">⚠️ {errorMsg}</div>}

          {/* Paste Raw JSON or View Schema */}
          <div className="form-group">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.35rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Or Paste / Edit Raw Exam JSON Array
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.22rem 0.6rem', fontSize: '0.74rem' }}
                  onClick={() => setShowFormatGuide((p) => !p)}
                >
                  {showFormatGuide ? 'Hide Schema Guide' : '📖 View JSON Format'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.22rem 0.6rem', fontSize: '0.74rem' }}
                  onClick={handleLoadSample}
                >
                  ✨ Load Sample JSON
                </button>
              </div>
            </div>

            {showFormatGuide && (
              <div className="json-schema-guide">
                <div className="json-schema-guide-header">
                  <span>Expected JSON Format (Array of Question Objects)</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.18rem 0.55rem', fontSize: '0.72rem' }}
                    onClick={handleCopySample}
                  >
                    📋 Copy Template
                  </button>
                </div>
                <pre>{SAMPLE_JSON_SNIPPET}</pre>
              </div>
            )}

            <textarea
              className="form-textarea json-code-textarea"
              placeholder='Paste JSON array here: [ { "id": 1, "question": "...", "options": [...], "explanation": "...", "isMultiple": true, "tags": ["..."] } ]'
              value={jsonText}
              onChange={handleJsonTextChange}
              rows={5}
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!parsedPreview || isSaving}
            >
              {isSaving
                ? 'Saving to Folder...'
                : `💾 Save ${examCode ? examCode.toUpperCase() : 'Exam'} (${
                    parsedPreview ? parsedPreview.questionCount : 0
                  } Qs)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

