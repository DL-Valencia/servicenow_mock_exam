import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  STORAGE_KEY,
  LEGACY_V2_KEY,
  LEGACY_STORAGE_KEY,
  createEmptyExamProgress,
  getDefaultState,
  loadPersistedState,
  savePersistedState,
  normalizeExamPayload,
  computeExamStats,
  shuffleArray,
  prepareSessionQuestions,
  serializeSession,
  restoreSession,
  isQuestionAnswerCorrect
} from '../utils/examHelpers';

// Auto-discover all JSON files placed inside src/data/exams/*.json
const bundledModules = import.meta.glob('../data/exams/*.json', { eager: true });

function loadBundledExamsMap() {
  const map = {};
  Object.entries(bundledModules).forEach(([filePath, mod]) => {
    try {
      const raw = mod.default || mod;
      const fileName = filePath.split('/').pop();
      const baseId = fileName.replace(/\.json$/i, '');
      const normalized = normalizeExamPayload(raw, {
        id: raw.id || baseId,
        code: raw.code || baseId.toUpperCase(),
        title: raw.title || `${baseId.toUpperCase()} Mock Exam`
      });
      map[normalized.id] = {
        ...normalized,
        fileName,
        isBundled: true
      };
    } catch (err) {
      console.error(`Failed loading bundled exam ${filePath}:`, err);
    }
  });
  return map;
}

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [bundledExams, setBundledExams] = useState(() => loadBundledExamsMap());
  const [state, setState] = useState(() => loadPersistedState());
  const [activeView, setActiveView] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin') {
      return 'admin';
    }
    return 'dashboard';
  }); // 'dashboard' | 'session' | 'results' | 'bank' | 'admin'
  const [currentSession, setCurrentSession] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [paletteFilter, setPaletteFilter] = useState('all'); // 'all' | 'unanswered' | 'flagged'
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastExamConfig, setLastExamConfig] = useState(null);
  const [lastExamResults, setLastExamResults] = useState(null);
  const [resultsReviewFilter, setResultsReviewFilter] = useState('all'); // 'all' | 'wrong'
  const [marathonShuffle, setMarathonShuffle] = useState(false);

  // Search & Filter state on the Home / Exam Catalog Dashboard
  const [examSearchQuery, setExamSearchQuery] = useState('');

  // UI state: Toast & Modals & Mobile Sidebar & Admin Auth
  const [toastMsg, setToastMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', desc: '', onConfirm: null });
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('sn_admin_auth') === 'true';
  });

  const adminCredentials = useMemo(() => {
    const envUser = import.meta.env.VITE_ADMIN_USERNAME;
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    return (
      state.adminCredentials || {
        username: envUser || 'admin',
        password: envPass || 'admin123'
      }
    );
  }, [state.adminCredentials]);

  // GitHub token (admin-only, stored in this browser) used by /api/exams to commit uploads to the repo
  const githubToken = useMemo(() => (state.githubToken || '').trim(), [state.githubToken]);

  // Bank filter state
  const [bankFilters, setBankFilters] = useState({
    query: '',
    source: 'all',
    topic: 'all',
    status: 'all'
  });

  const timerRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Sync with folder / GitHub API on mount (so newly saved files in src/data/exams are always fresh across all devices)
  useEffect(() => {
    fetch('/api/exams')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.exams)) {
          const nextMap = {};
          data.exams.forEach((raw) => {
            try {
              const norm = normalizeExamPayload(raw, raw);
              nextMap[norm.id] = {
                ...norm,
                fileName: raw.fileName || `${norm.id}.json`,
                isBundled: true
              };
            } catch (e) {
              console.error('Error normalizing exam from folder:', e);
            }
          });
          if (data.authoritative) {
            setBundledExams(nextMap);
          } else if (Object.keys(nextMap).length > 0) {
            setBundledExams((prev) => ({ ...prev, ...nextMap }));
          }
        }
      })
      .catch(() => {
        // Fallback silently if running offline
      });
  }, []);

  // Merge folder exams + custom uploaded exams in localStorage
  const examsList = useMemo(() => {
    const deletedSet = new Set(state.deletedBundledIds || []);
    const merged = {};

    Object.values(bundledExams).forEach((ex) => {
      if (!deletedSet.has(ex.id)) {
        merged[ex.id] = ex;
      }
    });

    Object.values(state.customExams || {}).forEach((ex) => {
      try {
        const norm = normalizeExamPayload(ex, ex);
        merged[norm.id] = {
          ...norm,
          isCustom: true,
          savedToFolder: Boolean(ex.savedToFolder || bundledExams[norm.id])
        };
      } catch (e) {
        console.error('Invalid custom exam in state:', e);
      }
    });

    return Object.values(merged).sort((a, b) => a.code.localeCompare(b.code));
  }, [bundledExams, state.customExams, state.deletedBundledIds]);

  const savedExamIds = useMemo(() => {
    return Array.isArray(state.savedExamIds) ? state.savedExamIds : [];
  }, [state.savedExamIds]);

  const savedExamsList = useMemo(() => {
    const savedSet = new Set(savedExamIds);
    return examsList.filter((ex) => savedSet.has(ex.id));
  }, [examsList, savedExamIds]);

  const activeExamId = state.activeExamId;

  const activeExam = useMemo(() => {
    if (!activeExamId) return null;
    return examsList.find((e) => e.id === activeExamId) || null;
  }, [examsList, activeExamId]);

  const questions = useMemo(() => {
    return activeExam ? activeExam.questions : [];
  }, [activeExam]);

  // Active exam's isolated progress object
  const activeExamProgress = useMemo(() => {
    if (!activeExam) return createEmptyExamProgress();
    return {
      ...createEmptyExamProgress(),
      ...(state.progressByExam?.[activeExam.id] || {})
    };
  }, [activeExam, state.progressByExam]);

  // Helper to update active exam's progress slice cleanly
  const updateActiveExamProgress = useCallback(
    (updater, targetExamId = null) => {
      const exId = targetExamId || activeExam?.id;
      if (!exId) return;
      setState((prev) => {
        const currentProg = {
          ...createEmptyExamProgress(),
          ...(prev.progressByExam?.[exId] || {})
        };
        const nextProg = typeof updater === 'function' ? updater(currentProg) : updater;
        return {
          ...prev,
          progressByExam: {
            ...(prev.progressByExam || {}),
            [exId]: nextProg
          }
        };
      });
    },
    [activeExam?.id]
  );

  // Sync theme attribute & localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    savePersistedState(state);
  }, [state]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  }, []);

  // Sync URL (/admin vs /) with browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin') {
        setActiveView('admin');
      } else {
        setActiveView((prev) => (prev === 'admin' ? 'dashboard' : prev));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showView = useCallback((viewName) => {
    setActiveView(viewName);
    setSidebarOpen(false);
    if (viewName === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      }
    } else if (window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase() === '#/admin') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const selectExam = useCallback(
    (examId, targetView = 'dashboard', autoSave = true) => {
      setState((prev) => {
        const currentSaved = Array.isArray(prev.savedExamIds) ? prev.savedExamIds : [];
        const nextSaved =
          autoSave && !currentSaved.includes(examId)
            ? [...currentSaved, examId]
            : currentSaved;
        return {
          ...prev,
          activeExamId: examId,
          savedExamIds: nextSaved
        };
      });
      setBankFilters({ query: '', source: 'all', topic: 'all', status: 'all' });
      setActiveView(targetView);
      setSidebarOpen(false);
      if (window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase() === '#/admin') {
        window.history.pushState({}, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const saveExamToDashboard = useCallback(
    (examId) => {
      const target = examsList.find((e) => e.id === examId);
      setState((prev) => {
        const currentSaved = Array.isArray(prev.savedExamIds) ? prev.savedExamIds : [];
        if (currentSaved.includes(examId)) return prev;
        return {
          ...prev,
          savedExamIds: [...currentSaved, examId]
        };
      });
      if (target) {
        showToast(`📌 Added "${target.code}" to My Exam Modules!`);
      }
    },
    [examsList, showToast]
  );

  const removeExamFromDashboard = useCallback(
    (examId) => {
      const target = examsList.find((e) => e.id === examId);
      setState((prev) => {
        const currentSaved = Array.isArray(prev.savedExamIds) ? prev.savedExamIds : [];
        return {
          ...prev,
          activeExamId: prev.activeExamId === examId ? null : prev.activeExamId,
          savedExamIds: currentSaved.filter((id) => id !== examId)
        };
      });
      if (activeExamId === examId) {
        setActiveView('dashboard');
      }
      if (target) {
        showToast(
          `✓ Removed "${target.code}" from My Exam Modules. Search anytime to add it back!`
        );
      }
    },
    [examsList, activeExamId, showToast]
  );

  const goHomeCatalog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeExamId: null
    }));
    setActiveView('dashboard');
    setSidebarOpen(false);
    if (window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase() === '#/admin') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  }, []);

  const loginAdmin = useCallback(
    (username, password) => {
      const validUser = (adminCredentials.username || 'admin').trim();
      const validPass = adminCredentials.password || 'admin123';
      if (username.trim() === validUser && password === validPass) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('sn_admin_auth', 'true');
        showToast('🔓 Admin Portal unlocked');
        return true;
      }
      return false;
    },
    [adminCredentials, showToast]
  );

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('sn_admin_auth');
    showToast('🔒 Admin Portal locked');
  }, [showToast]);

  const updateAdminCredentials = useCallback(
    (username, password) => {
      setState((prev) => ({
        ...prev,
        adminCredentials: { username, password }
      }));
      showToast('🔑 Admin credentials updated');
    },
    [showToast]
  );

  const updateGithubToken = useCallback(
    (token) => {
      const clean = (token || '').trim();
      setState((prev) => ({ ...prev, githubToken: clean }));
      showToast(clean ? '☁️ GitHub sync token saved.' : '☁️ GitHub sync token cleared.');
    },
    [showToast]
  );

  // Upload & Save a new Exam JSON (saves to src/data/exams/<id>.json via Vite API + localStorage)
  const registerUploadedExam = useCallback(
    async (rawJson, metaOverrides = {}, options = {}) => {
      const normalized = normalizeExamPayload(rawJson, metaOverrides);
      let savedToFolder = false;
      let syncError = '';

      try {
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(githubToken ? { 'x-github-token': githubToken } : {})
          },
          body: JSON.stringify(normalized)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          savedToFolder = true;
          setBundledExams((prev) => ({
            ...prev,
            [normalized.id]: {
              ...normalized,
              fileName: data.fileName || `${normalized.id}.json`,
              isBundled: true
            }
          }));
        } else {
          syncError = data?.error || `HTTP ${res.status}`;
        }
      } catch (err) {
        // Static build fallback: still stored in browser state
        syncError = err.message;
        console.warn('Could not write directly to disk API, storing in browser storage:', err);
      }

      setState((prev) => {
        const deletedBundledIds = (prev.deletedBundledIds || []).filter(
          (id) => id !== normalized.id
        );
        return {
          ...prev,
          activeExamId: options.stayOnAdmin ? prev.activeExamId : normalized.id,
          deletedBundledIds,
          customExams: {
            ...(prev.customExams || {}),
            [normalized.id]: {
              ...normalized,
              savedToFolder
            }
          },
          progressByExam: {
            ...(prev.progressByExam || {}),
            [normalized.id]: prev.progressByExam?.[normalized.id] || createEmptyExamProgress()
          }
        };
      });

      setUploadModalOpen(false);
      if (!options.stayOnAdmin) {
        setActiveView('dashboard');
      }
      showToast(
        savedToFolder
          ? `✅ "${normalized.code}" (${normalized.questions.length} Qs) saved to repository for all devices!`
          : `⚠️ "${normalized.code}" saved to this browser only${
              syncError ? ` (${syncError})` : ''
            }. Add a GitHub token in Admin → Admin Credentials → Cloud Sync Token to publish for all devices.`
      );
      return normalized;
    },
    [showToast, githubToken]
  );

  // Sync a browser-only custom exam to the repository (/api/exams) so all devices can see it
  const syncExamToRepository = useCallback(
    async (examId) => {
      const target = examsList.find((e) => e.id === examId);
      if (!target) return false;

      try {
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(githubToken ? { 'x-github-token': githubToken } : {})
          },
          body: JSON.stringify(target)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          setBundledExams((prev) => ({
            ...prev,
            [target.id]: {
              ...target,
              fileName: data.fileName || `${target.id}.json`,
              isBundled: true
            }
          }));
          setState((prev) => ({
            ...prev,
            customExams: {
              ...(prev.customExams || {}),
              [target.id]: {
                ...target,
                savedToFolder: true
              }
            }
          }));
          showToast(`☁️ Synced "${target.code}" to repository! Now visible on all devices.`);
          return true;
        } else {
          showToast(
            `⚠️ Cloud sync failed: ${data?.error || 'Add GITHUB_TOKEN in Vercel Environment Variables.'}`
          );
          return false;
        }
      } catch (err) {
        showToast(`⚠️ Could not reach /api/exams: ${err.message}`);
        return false;
      }
    },
    [examsList, showToast, githubToken]
  );

  // Delete an exam module
  const deleteExamModule = useCallback(
    (examId) => {
      const target = examsList.find((e) => e.id === examId);
      if (!target) return;

      setConfirmModal({
        open: true,
        title: `Delete "${target.code} - ${target.title}"?`,
        desc: `This will remove the ${target.code} exam module (${target.questions.length} questions) from your exam library and delete src/data/exams/${target.id}.json if present.`,
        onConfirm: async () => {
          try {
            await fetch(`/api/exams?id=${encodeURIComponent(examId)}`, {
              method: 'DELETE',
              headers: githubToken ? { 'x-github-token': githubToken } : {}
            });
          } catch (e) {
            // ignore network errors
          }

          setBundledExams((prev) => {
            const copy = { ...prev };
            delete copy[examId];
            return copy;
          });

          setState((prev) => {
            const customExams = { ...(prev.customExams || {}) };
            delete customExams[examId];
            const deletedBundledIds = Array.from(
              new Set([...(prev.deletedBundledIds || []), examId])
            );
            const savedExamIds = (prev.savedExamIds || []).filter((id) => id !== examId);
            return {
              ...prev,
              activeExamId: prev.activeExamId === examId ? null : prev.activeExamId,
              savedExamIds,
              customExams,
              deletedBundledIds
            };
          });

          showToast(`🗑️ Removed ${target.code} exam module.`);
        }
      });
    },
    [examsList, showToast, githubToken]
  );

  // Export an exam's clean questions JSON file
  const downloadExamJson = useCallback(
    (examId) => {
      const target = examsList.find((e) => e.id === examId) || activeExam;
      if (!target) return;
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(target.questions, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `${target.id}_questions.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`📥 Downloaded ${target.code} JSON (${target.questions.length} Qs)`);
    },
    [examsList, activeExam, showToast]
  );

  // Stats per exam for the Home Catalog & for the active exam Dashboard
  const statsByExam = useMemo(() => {
    const map = {};
    examsList.forEach((ex) => {
      const prog = state.progressByExam?.[ex.id] || createEmptyExamProgress();
      map[ex.id] = computeExamStats(ex.questions, prog);
    });
    return map;
  }, [examsList, state.progressByExam]);

  const dashboardStats = useMemo(() => {
    if (!activeExam) {
      return computeExamStats([], createEmptyExamProgress());
    }
    return statsByExam[activeExam.id] || computeExamStats(activeExam.questions, activeExamProgress);
  }, [activeExam, statsByExam, activeExamProgress]);

  const allTopics = useMemo(() => {
    const topics = new Set();
    questions.forEach((q) => (q.tags || []).forEach((t) => topics.add(t)));
    return Array.from(topics).sort();
  }, [questions]);

  const allSources = useMemo(() => {
    const sources = new Set();
    questions.forEach((q) => {
      if (q.source) sources.add(q.source);
    });
    return Array.from(sources);
  }, [questions]);

  // Finish Exam calculation
  const finishExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!currentSession) return;

    const targetExamId = currentSession.examId || activeExam?.id;
    const currentProg = {
      ...createEmptyExamProgress(),
      ...(state.progressByExam?.[targetExamId] || {})
    };

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const domainStats = {};
    const updatedHistory = { ...currentProg.history };

    currentSession.questions.forEach((q, idx) => {
      const userAns = currentSession.userAnswers[idx] || [];
      const qId = q.id;
      const isRight = userAns.length > 0 && isQuestionAnswerCorrect(q, userAns);

      (q.tags || ['General']).forEach((tag) => {
        if (!domainStats[tag]) domainStats[tag] = { total: 0, correct: 0 };
        domainStats[tag].total++;
        if (isRight) domainStats[tag].correct++;
      });

      if (userAns.length === 0) {
        unanswered++;
        const prev = updatedHistory[qId] || { timesAnswered: 0, correct: 0, lastResult: false };
        updatedHistory[qId] = {
          ...prev,
          timesAnswered: prev.timesAnswered + 1,
          lastResult: false
        };
      } else {
        if (isRight) {
          correct++;
        } else {
          incorrect++;
        }
        const prev = updatedHistory[qId] || { timesAnswered: 0, correct: 0, lastResult: true };
        updatedHistory[qId] = {
          timesAnswered: prev.timesAnswered + 1,
          correct: isRight ? prev.correct + 1 : prev.correct,
          lastResult: isRight
        };
      }
    });

    const total = currentSession.questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 70;

    const elapsedSecs = currentSession.duration
      ? currentSession.duration - Math.max(0, timeRemaining)
      : Math.round((Date.now() - currentSession.startTime) / 1000);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const elapsedRemainSecs = elapsedSecs % 60;
    const timeStr = `${elapsedMins}m ${elapsedRemainSecs}s`;

    const newAttempt = {
      date: new Date().toLocaleDateString(),
      examId: targetExamId,
      examCode: activeExam?.code || 'EXAM',
      title: currentSession.title,
      score: pct,
      passed,
      total,
      correct,
      timeTaken: timeStr
    };

    updateActiveExamProgress(
      (prevProg) => {
        const nextSavedSessions = { ...(prevProg.savedSessions || {}) };
        if (currentSession.mode === 'exam' || currentSession.sessionKey === 'timed_exam') {
          delete nextSavedSessions.timed_exam;
        }
        return {
          ...prevProg,
          history: updatedHistory,
          savedSessions: nextSavedSessions,
          examHistory: [...(prevProg.examHistory || []), newAttempt]
        };
      },
      targetExamId
    );

    setLastExamResults({
      passed,
      pct,
      correct,
      incorrect,
      unanswered,
      total,
      timeStr,
      domainStats,
      examCode: activeExam?.code || 'EXAM',
      examTitle: activeExam?.title || 'Mock Exam'
    });
    setResultsReviewFilter('all');
    showView('results');
  }, [
    currentSession,
    activeExam,
    state.progressByExam,
    timeRemaining,
    updateActiveExamProgress,
    showView
  ]);

  // Countdown timer effect for Exam Mode
  useEffect(() => {
    if (activeView === 'session' && currentSession?.mode === 'exam') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            showToast('⏰ Time is up! Submitting your exam for scoring.');
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeView, currentSession?.mode, finishExam, showToast]);

  // Session Initializer
  const initSession = useCallback(
    (questionList, mode, title, durationSeconds = 0, options = {}) => {
      if (!questionList || questionList.length === 0) {
        showToast('⚠️ No questions match this criteria.');
        return;
      }

      const targetExam = options.exam || activeExam;
      const targetExamId = targetExam?.id || state.activeExamId;
      const examProg = state.progressByExam?.[targetExamId] || createEmptyExamProgress();

      if (timerRef.current) clearInterval(timerRef.current);

      const { shuffleQuestions = false, shuffleChoices = false } = options;
      const preparedQuestions = prepareSessionQuestions(questionList, {
        shuffleQuestions,
        shuffleChoices
      });

      setLastExamConfig({
        examId: targetExamId,
        questions: questionList,
        mode,
        title,
        duration: durationSeconds,
        options
      });

      const { sessionKey = null, scopeTopic = null, fresh = false } = options;
      const saved = !fresh && sessionKey ? examProg.savedSessions?.[sessionKey] : null;
      const restored = saved ? restoreSession(saved, targetExam ? targetExam.questions : questionList) : null;

      if (restored && restored.questions.length > 0) {
        const restoredDuration = saved.duration || durationSeconds;
        const restoredRemaining =
          mode === 'exam' && saved.remainingSeconds > 0
            ? saved.remainingSeconds
            : restoredDuration;

        setCurrentSession({
          examId: targetExamId,
          examCode: targetExam?.code || 'EXAM',
          mode,
          title: saved.title || title,
          baseQuestions: questionList,
          questions: restored.questions,
          shuffled: !!saved.shuffled,
          sessionKey,
          scopeTopic,
          userAnswers: restored.userAnswers,
          checked: restored.checked,
          startTime: Date.now(),
          duration: restoredDuration,
          flagged: restored.flagged
        });
        setCurrentQIndex(Math.min(saved.idx || 0, restored.questions.length - 1));
        setPaletteFilter('all');
        setTimeRemaining(restoredRemaining);
        showView('session');
        showToast(
          mode === 'exam'
            ? '⏱️ Resumed your in-progress Timed Exam'
            : '▶️ Resumed your saved progress'
        );
        return;
      }

      setCurrentSession({
        examId: targetExamId,
        examCode: targetExam?.code || 'EXAM',
        mode, // 'study' | 'exam'
        title,
        baseQuestions: questionList,
        questions: preparedQuestions,
        shuffled: shuffleQuestions || shuffleChoices,
        sessionKey,
        scopeTopic,
        userAnswers: {}, // index: [selected labels]
        checked: {}, // index: boolean
        startTime: Date.now(),
        duration: durationSeconds,
        flagged: {} // index: boolean
      });

      setCurrentQIndex(0);
      setPaletteFilter('all');
      setTimeRemaining(durationSeconds);
      showView('session');
    },
    [activeExam, state.activeExamId, state.progressByExam, showView, showToast]
  );

  // Shuffle questions + answer choices while KEEPING all answers/checks/flags
  const reshuffleCurrentSession = useCallback(() => {
    if (!currentSession) return;
    const snap = serializeSession(currentSession, 0);
    snap.order = shuffleArray(snap.order);
    Object.keys(snap.choices).forEach((id) => {
      snap.choices[id] = shuffleArray(snap.choices[id]);
    });
    const restored = restoreSession(snap, questions);
    setCurrentSession((prev) => ({
      ...prev,
      questions: restored.questions,
      userAnswers: restored.userAnswers,
      checked: restored.checked,
      flagged: restored.flagged,
      shuffled: true
    }));
    setCurrentQIndex(0);
    showToast('🔀 Shuffled! Your answered questions are kept.');
  }, [currentSession, questions, showToast]);

  // Auto-save study and timed exam sessions that belong to a module so they can be resumed across reloads
  useEffect(() => {
    if (!currentSession?.sessionKey || !currentSession.examId) return;
    const snap = serializeSession(currentSession, currentQIndex, timeRemaining);
    updateActiveExamProgress(
      (prevProg) => ({
        ...prevProg,
        savedSessions: {
          ...(prevProg.savedSessions || {}),
          [currentSession.sessionKey]: snap
        }
      }),
      currentSession.examId
    );
  }, [currentSession, currentQIndex, timeRemaining, updateActiveExamProgress]);

  // Start Mode Helpers (Scoped to activeExam or passed exam)
  const startStudy = useCallback(
    (count, filterMode, title, shuffleOpts = null, customExam = null) => {
      const targetExam = customExam || activeExam;
      if (!targetExam) return;
      if (customExam && customExam.id !== activeExam?.id) {
        setState((prev) => ({ ...prev, activeExamId: customExam.id }));
      }
      let pool = [...targetExam.questions];
      if (filterMode === 'random') {
        pool = shuffleArray(pool);
      }
      const actualCount = Math.min(count, pool.length);
      const selected = pool.slice(0, actualCount);
      const shouldShuffle =
        shuffleOpts !== null ? shuffleOpts : filterMode === 'all' ? marathonShuffle : false;

      initSession(
        selected,
        'study',
        title || `${targetExam.code} Study Session`,
        0,
        {
          exam: targetExam,
          shuffleQuestions: shouldShuffle,
          shuffleChoices: shouldShuffle,
          sessionKey: filterMode === 'all' ? 'marathon' : null
        }
      );
    },
    [activeExam, marathonShuffle, initSession]
  );

  const startBySourceFilter = useCallback(
    (keyword, title) => {
      const pool = questions.filter((q) => (q.source || '').includes(keyword));
      initSession(pool, 'study', title);
    },
    [questions, initSession]
  );

  const startTopicPractice = useCallback(
    (topic) => {
      const pool = questions.filter((q) => (q.tags || []).includes(topic));
      initSession(pool, 'study', `${activeExam?.code || ''} Domain: ${topic} (${pool.length} Qs)`, 0, {
        sessionKey: `topic:${topic}`,
        scopeTopic: topic
      });
    },
    [questions, activeExam, initSession]
  );

  const startMistakesPractice = useCallback(
    (customExam = null) => {
      const targetExam = customExam || activeExam;
      if (!targetExam) return;
      const prog = state.progressByExam?.[targetExam.id] || createEmptyExamProgress();
      const missedIds = Object.keys(prog.history).filter(
        (id) => prog.history[id]?.lastResult === false
      );
      if (missedIds.length === 0) {
        showToast(
          `🎉 Great job! You have 0 questions in your ${targetExam.code} Mistakes Bank.`
        );
        return;
      }
      if (customExam && customExam.id !== activeExam?.id) {
        setState((prev) => ({ ...prev, activeExamId: customExam.id }));
      }
      const pool = targetExam.questions.filter((q) => missedIds.includes(String(q.id)));
      initSession(pool, 'study', `${targetExam.code} Mistakes Bank Drill (${pool.length} Qs)`, 0, {
        exam: targetExam
      });
    },
    [activeExam, state.progressByExam, initSession, showToast]
  );

  const startStarredPractice = useCallback(
    (customExam = null) => {
      const targetExam = customExam || activeExam;
      if (!targetExam) return;
      const prog = state.progressByExam?.[targetExam.id] || createEmptyExamProgress();
      const starredIds = Object.keys(prog.starred).filter((id) => prog.starred[id]);
      if (starredIds.length === 0) {
        showToast(
          `⭐ You have no starred questions in ${targetExam.code} yet. Click the star icon on any question to bookmark it.`
        );
        return;
      }
      if (customExam && customExam.id !== activeExam?.id) {
        setState((prev) => ({ ...prev, activeExamId: customExam.id }));
      }
      const pool = targetExam.questions.filter((q) => starredIds.includes(String(q.id)));
      initSession(pool, 'study', `${targetExam.code} Starred Questions (${pool.length} Qs)`, 0, {
        exam: targetExam
      });
    },
    [activeExam, state.progressByExam, initSession, showToast]
  );

  const startExam = useCallback(
    (count = 60, title = null, durationMinutes = 90, customExam = null, fresh = false) => {
      const targetExam = customExam || activeExam;
      if (!targetExam) return;
      if (customExam && customExam.id !== activeExam?.id) {
        setState((prev) => ({ ...prev, activeExamId: customExam.id }));
      }
      const actualCount = Math.min(count, targetExam.questions.length);
      const pool = shuffleArray([...targetExam.questions]).slice(0, actualCount);
      const examTitle = title || `Timed ${targetExam.code} Exam Simulator (${actualCount} Qs)`;
      initSession(pool, 'exam', examTitle, durationMinutes * 60, {
        exam: targetExam,
        shuffleChoices: true,
        sessionKey: 'timed_exam',
        fresh
      });
    },
    [activeExam, initSession]
  );

  const retakeCurrentExam = useCallback(() => {
    if (!lastExamConfig) {
      startExam(60, null, 90, null, true);
      return;
    }
    initSession(
      shuffleArray([...lastExamConfig.questions]),
      lastExamConfig.mode,
      lastExamConfig.title,
      lastExamConfig.duration,
      { ...(lastExamConfig.options || {}), fresh: true }
    );
  }, [lastExamConfig, startExam, initSession]);

  // Question interaction handlers
  const handleOptionClick = useCallback(
    (letter, question) => {
      if (!currentSession) return;
      if (currentSession.checked[currentQIndex] && currentSession.mode === 'study') return;

      const currentSelected = [...(currentSession.userAnswers[currentQIndex] || [])];
      const correctCount = question.options.filter((o) => o.isCorrect).length;
      const isMulti = question.isMultiple || correctCount > 1;

      let nextSelected;
      if (isMulti) {
        if (currentSelected.includes(letter)) {
          nextSelected = currentSelected.filter((l) => l !== letter);
        } else {
          if (correctCount > 1 && currentSelected.length >= correctCount) {
            showToast(
              `ℹ️ Choose ${correctCount} options for this question. Deselect an option first to change your choice.`
            );
            return;
          }
          nextSelected = [...currentSelected, letter];
        }
      } else {
        nextSelected = [letter];
      }

      setCurrentSession((prev) => ({
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [currentQIndex]: nextSelected
        }
      }));
    },
    [currentSession, currentQIndex, showToast]
  );

  const handleMatchingSelect = useCallback(
    (pairLabel, selectedTarget, fromPairLabel = null) => {
      if (!currentSession) return;
      if (currentSession.checked[currentQIndex] && currentSession.mode === 'study') return;

      const currentList = [...(currentSession.userAnswers[currentQIndex] || [])];
      const map = {};
      currentList.forEach((entry) => {
        const idx = entry.indexOf(':');
        if (idx !== -1) {
          const lbl = entry.slice(0, idx);
          const val = entry.slice(idx + 1);
          map[lbl] = val;
        }
      });

      if (!selectedTarget) {
        // Unassign slot (return to pool)
        delete map[pairLabel];
      } else if (fromPairLabel && fromPairLabel !== pairLabel) {
        // Dragged from one slot to another -> swap or move
        const destExisting = map[pairLabel];
        map[pairLabel] = selectedTarget;
        if (destExisting) {
          map[fromPairLabel] = destExisting;
        } else {
          delete map[fromPairLabel];
        }
      } else {
        // Dragged from bottom pool -> ensure unique placement across slots
        Object.keys(map).forEach((lbl) => {
          if (map[lbl] === selectedTarget) {
            delete map[lbl];
          }
        });
        map[pairLabel] = selectedTarget;
      }

      const nextList = Object.entries(map).map(([lbl, val]) => `${lbl}:${val}`);

      setCurrentSession((prev) => ({
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [currentQIndex]: nextList
        }
      }));
    },
    [currentSession, currentQIndex]
  );

  const clearCurrentSelection = useCallback(() => {
    if (!currentSession) return;
    if (currentSession.checked[currentQIndex] && currentSession.mode === 'study') return;
    setCurrentSession((prev) => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [currentQIndex]: []
      }
    }));
  }, [currentSession, currentQIndex]);

  const checkAnswer = useCallback(() => {
    if (!currentSession) return;
    const q = currentSession.questions[currentQIndex];
    const userSelected = currentSession.userAnswers[currentQIndex] || [];

    if (q.isMatching && Array.isArray(q.matchingPairs)) {
      if (userSelected.length < q.matchingPairs.length) {
        showToast(
          `Please match all ${q.matchingPairs.length} items before checking (${userSelected.length}/${q.matchingPairs.length} matched).`
        );
        return;
      }
    } else if (userSelected.length === 0) {
      showToast('Please select an option before checking.');
      return;
    } else {
      const requiredCount = q.options.filter((o) => o.isCorrect).length;
      if ((q.isMultiple || requiredCount > 1) && userSelected.length < requiredCount) {
        showToast(
          `Please select ${requiredCount} options before checking (${userSelected.length}/${requiredCount} selected).`
        );
        return;
      }
    }

    const isCorrect = isQuestionAnswerCorrect(q, userSelected);
    const qId = q.id;

    setCurrentSession((prev) => ({
      ...prev,
      checked: {
        ...prev.checked,
        [currentQIndex]: true
      }
    }));

    updateActiveExamProgress((prevProg) => {
      const existing = prevProg.history[qId] || { timesAnswered: 0, correct: 0, lastResult: true };
      const next = {
        ...prevProg,
        history: {
          ...prevProg.history,
          [qId]: {
            timesAnswered: existing.timesAnswered + 1,
            correct: isCorrect ? existing.correct + 1 : existing.correct,
            lastResult: isCorrect
          }
        }
      };
      const topic = currentSession.scopeTopic;
      if (topic) {
        const dh = prevProg.domainHistory || {};
        const dEx = dh[topic]?.[qId] || { timesAnswered: 0, correct: 0, lastResult: true };
        next.domainHistory = {
          ...dh,
          [topic]: {
            ...(dh[topic] || {}),
            [qId]: {
              timesAnswered: dEx.timesAnswered + 1,
              correct: isCorrect ? dEx.correct + 1 : dEx.correct,
              lastResult: isCorrect
            }
          }
        };
      }
      return next;
    }, currentSession.examId);
  }, [currentSession, currentQIndex, showToast, updateActiveExamProgress]);

  const prevQuestion = useCallback(() => {
    setCurrentQIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const nextQuestion = useCallback(() => {
    if (!currentSession) return;
    setCurrentQIndex((prev) =>
      prev < currentSession.questions.length - 1 ? prev + 1 : prev
    );
  }, [currentSession]);

  const jumpToQuestion = useCallback(
    (index) => {
      if (currentSession && index >= 0 && index < currentSession.questions.length) {
        setCurrentQIndex(index);
      }
    },
    [currentSession]
  );

  const toggleCurrentFlag = useCallback(() => {
    if (!currentSession) return;
    const nextFlagged = !currentSession.flagged[currentQIndex];
    setCurrentSession((prev) => ({
      ...prev,
      flagged: {
        ...prev.flagged,
        [currentQIndex]: nextFlagged
      }
    }));
    showToast(nextFlagged ? '🚩 Question flagged for exam review' : 'Flag removed');
  }, [currentSession, currentQIndex, showToast]);

  const toggleQuestionStar = useCallback(
    (qId) => {
      const nextStar = !activeExamProgress.starred[qId];
      updateActiveExamProgress((prevProg) => ({
        ...prevProg,
        starred: {
          ...prevProg.starred,
          [qId]: nextStar
        }
      }));
      showToast(nextStar ? '⭐ Question bookmarked' : 'Bookmark removed');
    },
    [activeExamProgress.starred, updateActiveExamProgress, showToast]
  );

  const toggleCurrentStar = useCallback(() => {
    if (!currentSession) return;
    const q = currentSession.questions[currentQIndex];
    if (q) toggleQuestionStar(q.id);
  }, [currentSession, currentQIndex, toggleQuestionStar]);

  const updateQuestionNote = useCallback(
    (qId, text) => {
      updateActiveExamProgress((prevProg) => ({
        ...prevProg,
        notes: {
          ...prevProg.notes,
          [qId]: text
        }
      }));
    },
    [updateActiveExamProgress]
  );

  // Modals & Confirmations
  const openModal = useCallback((title, desc, onConfirm) => {
    setConfirmModal({ open: true, title, desc, onConfirm });
  }, []);

  const closeModal = useCallback(() => {
    setConfirmModal({ open: false, title: '', desc: '', onConfirm: null });
  }, []);

  const handleModalConfirm = useCallback(() => {
    if (typeof confirmModal.onConfirm === 'function') {
      confirmModal.onConfirm();
    }
    closeModal();
  }, [confirmModal, closeModal]);

  const confirmExitSession = useCallback(() => {
    if (!currentSession) {
      showView('dashboard');
      return;
    }
    if (currentSession.mode === 'exam') {
      openModal(
        'Leave Exam?',
        `Your current ${currentSession.examCode || ''} exam is in progress. Leaving will calculate your score based on answered questions.`,
        () => finishExam()
      );
    } else {
      showView('dashboard');
    }
  }, [currentSession, showView, openModal, finishExam]);

  const confirmFinishExam = useCallback(() => {
    if (!currentSession) return;
    const total = currentSession.questions.length;
    const answered = Object.keys(currentSession.userAnswers).filter(
      (k) => currentSession.userAnswers[k] && currentSession.userAnswers[k].length > 0
    ).length;
    const unanswered = total - answered;

    let msg = `You have answered ${answered} of ${total} questions.`;
    if (unanswered > 0) {
      msg += ` There are ${unanswered} unanswered questions remaining.`;
    }
    msg += ` Are you ready to submit your ${currentSession.examCode || ''} exam for scoring?`;

    openModal(`Submit ${currentSession.examCode || ''} Exam?`, msg, () => finishExam());
  }, [currentSession, openModal, finishExam]);

  const confirmReset = useCallback(() => {
    if (activeExam) {
      openModal(
        `Reset ${activeExam.code} Progress?`,
        `This will clear your answer history, test stats, exam attempts, bookmarks, and personal notes for ${activeExam.code} (${activeExam.title}). Other uploaded exams will not be affected.`,
        () => {
          updateActiveExamProgress(createEmptyExamProgress(), activeExam.id);
          setCurrentSession(null);
          setLastExamResults(null);
          showView('dashboard');
          showToast(`Progress for ${activeExam.code} reset.`);
        }
      );
    } else {
      openModal(
        'Reset All Exam Progress?',
        'This will clear your answer history, test stats, bookmarks, and notes across all exams. Your saved exam JSON files in src/data/exams will remain intact.',
        () => {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_V2_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          setState((prev) => ({
            ...getDefaultState(),
            theme: prev.theme,
            customExams: prev.customExams
          }));
          setCurrentSession(null);
          setLastExamResults(null);
          showView('dashboard');
          showToast('All study progress reset successfully.');
        }
      );
    }
  }, [activeExam, openModal, updateActiveExamProgress, showView, showToast]);

  // Wipe saved progress for the active module and restart it fresh
  const resetCurrentModule = useCallback(() => {
    if (!currentSession?.sessionKey) return;
    const { sessionKey, scopeTopic, baseQuestions, title, mode, examId } = currentSession;
    openModal(
      'Reset this module?',
      'This clears your saved answers and progress for this module only. Other modules are not affected.',
      () => {
        updateActiveExamProgress((prevProg) => {
          const savedSessions = { ...(prevProg.savedSessions || {}) };
          delete savedSessions[sessionKey];
          const domainHistory = { ...(prevProg.domainHistory || {}) };
          if (scopeTopic) delete domainHistory[scopeTopic];
          return { ...prevProg, savedSessions, domainHistory };
        }, examId);
        initSession(baseQuestions, mode, title, 0, { sessionKey, scopeTopic, fresh: true });
      }
    );
  }, [currentSession, initSession, openModal, updateActiveExamProgress]);

  // Export personal study notes for the active exam as a Markdown study sheet
  const exportStudyNotes = useCallback(() => {
    if (!activeExam) return;
    const notesMap = activeExamProgress.notes || {};
    const notedQuestions = activeExam.questions.filter(
      (q) => String(notesMap[q.id] || '').trim().length > 0
    );
    if (notedQuestions.length === 0) {
      showToast(`📝 No study notes saved for ${activeExam.code} yet.`);
      return;
    }

    const lines = [
      `# ${activeExam.code} — ${activeExam.title} Study Notes`,
      `Generated: ${new Date().toLocaleDateString()} · ${notedQuestions.length} Question Note(s)`,
      '',
      '---',
      ''
    ];

    notedQuestions.forEach((q) => {
      const correctOpts = q.options
        .filter((o) => o.isCorrect)
        .map((o) => `[${o.label}] ${o.text}`)
        .join(' | ');
      lines.push(`### Q#${q.id}: ${q.question}`);
      lines.push(`- **Domain(s):** ${(q.tags || ['General']).join(', ')}`);
      lines.push(`- **Correct Answer:** ${correctOpts}`);
      lines.push(`- **My Study Note:** ${String(notesMap[q.id]).trim()}`);
      if (q.explanation) {
        lines.push(`- **Explanation:** ${q.explanation}`);
      }
      lines.push('');
    });

    const mdContent = lines.join('\n');
    const dataStr =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `${activeExam.code.toLowerCase()}_study_notes_${new Date().toISOString().slice(0, 10)}.md`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`📝 Exported ${notedQuestions.length} study note(s) as Markdown!`);
  }, [activeExam, activeExamProgress.notes, showToast]);

  // Export & Import Full Hub Backup Data
  const exportData = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `servicenow_exam_hub_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('✅ Progress backup downloaded');
  }, [state, showToast]);

  const importDataFromFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.progressByExam) {
            setState((prev) => ({
              ...prev,
              ...imported
            }));
            setDataModalOpen(false);
            showToast('🎉 All exam progress restored successfully!');
          } else if (imported.history && imported.starred) {
            // Legacy v2 backup import into current or CAD exam
            const targetId = activeExam?.id || 'cad';
            updateActiveExamProgress(
              {
                history: imported.history || {},
                starred: imported.starred || {},
                notes: imported.notes || {},
                domainHistory: imported.domainHistory || {},
                savedSessions: imported.savedSessions || {},
                examHistory: imported.examHistory || []
              },
              targetId
            );
            setDataModalOpen(false);
            showToast(`🎉 Progress restored into ${targetId.toUpperCase()}!`);
          } else {
            alert('Invalid backup file format. To upload a new Exam question set, use the "Upload Exam JSON" button.');
          }
        } catch (err) {
          alert('Failed to parse JSON backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    },
    [activeExam, updateActiveExamProgress, showToast]
  );

  // Backwards-compatible `state` adapter for child components that read `state.history`, `state.starred`, `state.notes`, `state.examHistory`
  const scopedState = useMemo(() => {
    return {
      ...state,
      history: activeExamProgress.history,
      starred: activeExamProgress.starred,
      notes: activeExamProgress.notes,
      domainHistory: activeExamProgress.domainHistory,
      savedSessions: activeExamProgress.savedSessions,
      examHistory: activeExamProgress.examHistory
    };
  }, [state, activeExamProgress]);

  const value = {
    examsList,
    savedExamIds,
    savedExamsList,
    saveExamToDashboard,
    removeExamFromDashboard,
    statsByExam,
    activeExam,
    activeExamId,
    selectExam,
    goHomeCatalog,
    examSearchQuery,
    setExamSearchQuery,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    adminCredentials,
    updateAdminCredentials,
    githubToken,
    updateGithubToken,
    registerUploadedExam,
    syncExamToRepository,
    deleteExamModule,
    downloadExamJson,
    uploadModalOpen,
    setUploadModalOpen,
    questions,
    state: scopedState,
    rawState: state,
    activeView,
    showView,
    toggleTheme,
    dashboardStats,
    allTopics,
    allSources,
    currentSession,
    currentQIndex,
    paletteFilter,
    setPaletteFilter,
    timeRemaining,
    lastExamResults,
    resultsReviewFilter,
    setResultsReviewFilter,
    marathonShuffle,
    setMarathonShuffle,
    reshuffleCurrentSession,
    resetCurrentModule,
    startStudy,
    startBySourceFilter,
    startTopicPractice,
    startMistakesPractice,
    startStarredPractice,
    startExam,
    retakeCurrentExam,
    handleOptionClick,
    handleMatchingSelect,
    clearCurrentSelection,
    checkAnswer,
    prevQuestion,
    nextQuestion,
    jumpToQuestion,
    toggleCurrentFlag,
    toggleQuestionStar,
    toggleCurrentStar,
    updateQuestionNote,
    confirmExitSession,
    confirmFinishExam,
    confirmReset,
    confirmModal,
    closeModal,
    handleModalConfirm,
    shortcutsModalOpen,
    setShortcutsModalOpen,
    dataModalOpen,
    setDataModalOpen,
    sidebarOpen,
    setSidebarOpen,
    exportData,
    exportStudyNotes,
    importDataFromFile,
    bankFilters,
    setBankFilters,
    toastMsg,
    showToast
  };

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within an ExamProvider');
  return ctx;
}
