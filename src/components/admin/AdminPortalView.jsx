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

export default function AdminPortalView() {
  const {
    examsList,
    statsByExam,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    adminCredentials,
    updateAdminCredentials,
    registerUploadedExam,
    syncExamToRepository,
    deleteExamModule,
    downloadExamJson,
    selectExam,
    goHomeCatalog,
    showToast
  } = useExam();

  // Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Upload Form State
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

  // Change Password / Settings State
  const [showCredSettings, setShowCredSettings] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState(adminCredentials.username);
  const [newAdminPass, setNewAdminPass] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    const ok = loginAdmin(usernameInput, passwordInput);
    if (!ok) {
      setLoginError('Invalid administrator username or passcode.');
    } else {
      setPasswordInput('');
    }
  };

  const resetUploadForm = () => {
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

  const parseAndPreview = (rawStr, fileNameHint = '') => {
    setErrorMsg('');
    try {
      const parsed = JSON.parse(rawStr);
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
        multiCount
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

  const handleUploadSubmit = async (e) => {
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
      await registerUploadedExam(
        rawParsed,
        {
          id: code.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
          code,
          title,
          category: examCategory.trim() || 'ServiceNow Certification',
          description: examDesc.trim()
        },
        { stayOnAdmin: true }
      );
      resetUploadForm();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save exam JSON.');
      setIsSaving(false);
    }
  };

  const handleUpdateCreds = (e) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminPass.trim()) {
      showToast('⚠️ Username and password cannot be empty.');
      return;
    }
    updateAdminCredentials(newAdminUser.trim(), newAdminPass.trim());
    setNewAdminPass('');
    setShowCredSettings(false);
  };

  // IF NOT LOGGED IN -> RENDER ADMIN LOGIN GATE
  if (!isAdminAuthenticated) {
    return (
      <div className="view-animate admin-login-wrapper">
        <div className="admin-login-card">
          <div className="admin-login-badge">🛡️ Restricted Access</div>
          <h2>Admin Portal Login</h2>
          <p>
            Only authorized administrators can upload new exam JSON modules or delete existing
            exam modules from the repository.
          </p>

          <form onSubmit={handleLoginSubmit} className="admin-login-form">
            <div className="form-group">
              <label className="form-label">Admin Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter administrator username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin Passcode</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter administrator passcode"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>

            {loginError && <div className="upload-error-box">⚠️ {loginError}</div>}

            <div className="admin-login-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={goHomeCatalog}
              >
                ← Back to Exam Hub
              </button>
              <button type="submit" className="btn btn-primary">
                🔓 Unlock Admin Portal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN -> RENDER FULL ADMIN PORTAL (UPLOAD + MODULE MANAGEMENT / DELETE)
  return (
    <div className="view-animate dashboard-stack">
      {/* ADMIN PORTAL TOP BAR */}
      <div className="admin-header-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="mode-badge primary" style={{ marginBottom: 0 }}>
              🛡️ Administrator Portal
            </span>
            <span className="mode-badge success" style={{ marginBottom: 0 }}>
              ● Authenticated ({adminCredentials.username})
            </span>
          </div>
          <h2>Exam Repository & Module Manager</h2>
          <p>
            Upload new <code>.json</code> exam modules to <code>src/data/exams/</code>, update
            existing sets, or delete exam modules from the platform.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowCredSettings((p) => !p)}
          >
            ⚙️ Admin Credentials
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={goHomeCatalog}
          >
            ← View Student Catalog
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={logoutAdmin}
          >
            🔒 Lock Admin Portal
          </button>
        </div>
      </div>

      {/* OPTIONAL CREDENTIALS SETTINGS PANEL */}
      {showCredSettings && (
        <div className="topics-section">
          <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>
            🔑 Update Admin Portal Credentials
          </h3>
          <form
            onSubmit={handleUpdateCreds}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              alignItems: 'end'
            }}
          >
            <div className="form-group">
              <label className="form-label">New Admin Username</label>
              <input
                type="text"
                className="form-input"
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Admin Passcode</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter new passcode"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">
                Save Credentials
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCredSettings(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TWO-COLUMN ADMIN WORKSPACE: UPLOAD JSON + MANAGE / DELETE MODULES */}
      <div className="admin-portal-grid">
        {/* LEFT COLUMN: UPLOAD NEW EXAM JSON */}
        <div className="topics-section">
          <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>
            📤 Upload New Exam Module (.json)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.15rem' }}>
            Upload a JSON file (e.g., <strong>CSA</strong>, <strong>CAD</strong>,{' '}
            <strong>CIS-ITSM</strong>). Saving an existing Exam Code will update that module.
          </p>

          <form onSubmit={handleUploadSubmit} className="upload-form">
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
                Target path:{' '}
                <code>src/data/exams/{(examCode || 'exam').toLowerCase()}.json</code>
              </span>
            </div>

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
                    <span>{parsedPreview.tagsCount} Tags</span>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetUploadForm}>
                Clear Form
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!parsedPreview || isSaving}
              >
                {isSaving
                  ? 'Saving to Folder...'
                  : `💾 Save ${examCode ? examCode.toUpperCase() : 'Exam'} to Folder (${
                      parsedPreview ? parsedPreview.questionCount : 0
                    } Qs)`}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: MANAGE & DELETE EXISTING MODULES */}
        <div className="topics-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.25rem'
            }}
          >
            <h3 className="section-title" style={{ marginBottom: 0 }}>
              🗂️ Manage & Delete Exam Modules ({examsList.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.15rem' }}>
            All active exam JSON files stored in <code>src/data/exams/</code>. Deleting a module
            removes it from the student catalog and deletes its JSON file.
          </p>

          {examsList.length === 0 ? (
            <div className="catalog-empty-state" style={{ padding: '2rem 1rem' }}>
              <p>No exam modules currently stored. Upload a JSON file on the left to add one.</p>
            </div>
          ) : (
            <div className="admin-modules-list">
              {examsList.map((exam) => {
                const st = statsByExam[exam.id] || {};
                const topicsCount = Object.keys(st.topicCounts || {}).length;

                return (
                  <div key={exam.id} className="admin-module-row">
                    <div className="admin-module-info">
                      <div className="exam-code-avatar" style={{ width: '42px', height: '42px', fontSize: '0.85rem' }}>
                        {exam.code.slice(0, 4)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.96rem' }}>{exam.title}</strong>
                          <span className="mode-badge primary" style={{ marginBottom: 0 }}>
                            {exam.code}
                          </span>
                          {exam.isBundled || exam.savedToFolder ? (
                            <span className="mode-badge success" style={{ marginBottom: 0 }}>
                              🌐 All Devices
                            </span>
                          ) : (
                            <span className="mode-badge warning" style={{ marginBottom: 0 }}>
                              ⚠️ Browser Only
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.2rem',
                            display: 'flex',
                            gap: '0.6rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span>
                            📄 <code>src/data/exams/{exam.fileName || `${exam.id}.json`}</code>
                          </span>
                          <span>·</span>
                          <span>
                            <strong>{exam.questions.length}</strong> Questions
                          </span>
                          <span>·</span>
                          <span>
                            <strong>{topicsCount}</strong> Domains/Tags
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-module-actions">
                      {!exam.isBundled && !exam.savedToFolder && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => syncExamToRepository(exam.id)}
                          title="Push this browser-only exam to GitHub so all devices can search and take it"
                        >
                          ☁️ Sync to All Devices
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => selectExam(exam.id, 'dashboard')}
                        title="Open this exam's Study Hub"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => downloadExamJson(exam.id)}
                        title="Download raw JSON file"
                      >
                        📥 JSON
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteExamModule(exam.id)}
                        title={`Delete ${exam.code} module`}
                      >
                        🗑️ Delete Module
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

