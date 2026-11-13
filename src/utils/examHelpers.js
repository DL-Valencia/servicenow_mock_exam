export const STORAGE_KEY = 'servicenow_exam_hub_v3';
export const LEGACY_V2_KEY = 'cad_mock_exam_v2';
export const LEGACY_STORAGE_KEY = 'cad_mock_exam_state_v1';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function createEmptyExamProgress() {
  return {
    history: {}, // qId: { timesAnswered, correct, lastResult }
    starred: {}, // qId: true
    notes: {}, // qId: "text"
    domainHistory: {}, // topic: { qId: { timesAnswered, correct, lastResult } }
    savedSessions: {}, // sessionKey: serialized session snapshot
    examHistory: [] // [{ date, title, score, passed, total, correct, timeTaken }]
  };
}

export function getDefaultState() {
  return {
    theme: 'dark',
    activeExamId: null,
    savedExamIds: [], // ids of exams the user searched and saved to their dashboard
    customExams: {}, // examId: { id, code, title, category, description, questions, createdAt }
    deletedBundledIds: [], // ids of bundled exams user explicitly deleted in browser
    progressByExam: {
      cad: createEmptyExamProgress()
    }
  };
}

export function loadPersistedState() {
  const defaultState = getDefaultState();
  try {
    const savedV3 = localStorage.getItem(STORAGE_KEY);
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      return {
        ...defaultState,
        ...parsed,
        progressByExam: {
          ...defaultState.progressByExam,
          ...(parsed.progressByExam || {})
        }
      };
    }

    // Migrate from v2 / v1 single-CAD state if present
    const savedV2 = localStorage.getItem(LEGACY_V2_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (savedV2) {
      const legacy = JSON.parse(savedV2);
      return {
        ...defaultState,
        theme: legacy.theme || 'dark',
        progressByExam: {
          cad: {
            history: legacy.history || {},
            starred: legacy.starred || {},
            notes: legacy.notes || {},
            domainHistory: legacy.domainHistory || {},
            savedSessions: legacy.savedSessions || {},
            examHistory: legacy.examHistory || []
          }
        }
      };
    }

    return defaultState;
  } catch (err) {
    console.error('Error loading persisted state:', err);
    return defaultState;
  }
}

export function savePersistedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

/**
 * Normalizes and validates raw uploaded JSON (either an array of questions or an exam object).
 */
export function normalizeExamPayload(rawJson, fallbackMeta = {}) {
  let rawQuestions = null;
  let meta = {};

  if (Array.isArray(rawJson)) {
    rawQuestions = rawJson;
  } else if (rawJson && typeof rawJson === 'object' && Array.isArray(rawJson.questions)) {
    rawQuestions = rawJson.questions;
    meta = rawJson;
  } else {
    throw new Error(
      'Invalid JSON structure. Expected a JSON array of questions `[ { id, question, options, ... } ]` or an exam object with a `questions` array.'
    );
  }

  if (rawQuestions.length === 0) {
    throw new Error('The JSON file contains 0 questions.');
  }

  const normalizedQuestions = rawQuestions.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Question at index ${idx} is not a valid object.`);
    }
    const qText = String(item.question || item.text || '').trim();
    if (!qText) {
      throw new Error(`Question #${idx + 1} is missing the "question" text field.`);
    }
    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`Question #${idx + 1} ("${qText.slice(0, 40)}...") must have at least 2 options.`);
    }

    const options = item.options.map((opt, optIdx) => {
      const label = String(opt.label || OPTION_LABELS[optIdx] || optIdx + 1).trim();
      const text = String(opt.text ?? opt.value ?? '').trim();
      const isCorrect = Boolean(opt.isCorrect);
      return {
        label,
        text,
        isCorrect
      };
    });

    const correctCount = options.filter((o) => o.isCorrect).length;
    const isMultiple =
      typeof item.isMultiple === 'boolean' ? item.isMultiple : correctCount > 1;

    // Auto-detect matching questions (e.g., all options have "Prompt → Target" or item.pairs is provided)
    let isMatching = Boolean(item.isMatching || item.type === 'matching');
    let matchingPairs = [];

    if (Array.isArray(item.pairs) && item.pairs.length >= 2) {
      isMatching = true;
      matchingPairs = item.pairs.map((p, pIdx) => ({
        label: String(p.label || OPTION_LABELS[pIdx] || pIdx + 1).trim(),
        prompt: String(p.prompt || p.left || '').trim(),
        answer: String(p.answer || p.right || '').trim()
      }));
    } else {
      const arrowRegex = /\s*(?:→|->)\s*/;
      const allHaveArrow =
        options.length >= 2 &&
        options.every((o) => o.isCorrect && arrowRegex.test(o.text));
      if (allHaveArrow) {
        isMatching = true;
        matchingPairs = options.map((o) => {
          const parts = o.text.split(arrowRegex);
          const prompt = parts.slice(0, -1).join(' → ').trim();
          const answer = parts[parts.length - 1].trim();
          return {
            label: o.label,
            prompt,
            answer
          };
        });
      }
    }

    const tags = Array.isArray(item.tags)
      ? item.tags.map((t) => String(t).trim()).filter(Boolean)
      : item.domain
      ? [String(item.domain).trim()]
      : ['General'];

    return {
      id: item.id !== undefined && item.id !== null ? item.id : idx + 1,
      question: qText,
      options,
      explanation: item.explanation ? String(item.explanation).trim() : '',
      isMultiple: isMatching ? false : isMultiple,
      isMatching,
      matchingPairs,
      source: item.source ? String(item.source).trim() : fallbackMeta.code || meta.code || 'Uploaded Set',
      tags: tags.length > 0 ? tags : ['General']
    };
  });

  const code = String(fallbackMeta.code || meta.code || fallbackMeta.id || meta.id || 'EXAM')
    .trim()
    .toUpperCase();
  const id = String(fallbackMeta.id || meta.id || code)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `exam-${Date.now()}`;

  const title =
    String(fallbackMeta.title || meta.title || '').trim() || `${code} Mock Exam`;
  const category =
    String(fallbackMeta.category || meta.category || '').trim() || 'ServiceNow Certification';
  const description =
    String(fallbackMeta.description || meta.description || '').trim() ||
    `Practice ${normalizedQuestions.length} verified questions across all topics in ${title}.`;

  return {
    id,
    code,
    title,
    category,
    description,
    fileName: meta.fileName || `${id}.json`,
    createdAt: meta.createdAt || new Date().toISOString(),
    questions: normalizedQuestions
  };
}

export function computeExamStats(questions = [], progress = {}) {
  const history = progress?.history || {};
  const starred = progress?.starred || {};
  const domainHistory = progress?.domainHistory || {};

  const questionIdSet = new Set(questions.map((q) => String(q.id)));
  const answeredIds = Object.keys(history).filter((id) => questionIdSet.has(String(id)));
  const totalAnswered = answeredIds.length;
  let totalCorrect = 0;
  let missedCount = 0;

  answeredIds.forEach((id) => {
    const h = history[id];
    if (h && h.correct > 0) totalCorrect++;
    if (h && h.lastResult === false) missedCount++;
  });

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const starredCount = Object.keys(starred).filter(
    (k) => starred[k] && questionIdSet.has(String(k))
  ).length;

  const topicCounts = {};
  const domainProgress = {};

  questions.forEach((q) => {
    (q.tags || ['General']).forEach((t) => {
      const h = domainHistory?.[t]?.[q.id] || history?.[q.id];
      const isAnswered = !!h && h.timesAnswered > 0;
      const isCorrect = !!h && h.correct > 0;
      topicCounts[t] = (topicCounts[t] || 0) + 1;
      if (!domainProgress[t]) {
        domainProgress[t] = { total: 0, answered: 0, correct: 0, pctAnswered: 0, accuracy: 0 };
      }
      domainProgress[t].total += 1;
      if (isAnswered) domainProgress[t].answered += 1;
      if (isCorrect) domainProgress[t].correct += 1;
    });
  });

  Object.keys(domainProgress).forEach((t) => {
    const d = domainProgress[t];
    d.pctAnswered = d.total > 0 ? Math.round((d.answered / d.total) * 100) : 0;
    d.accuracy = d.answered > 0 ? Math.round((d.correct / d.answered) * 100) : 0;
  });

  const coveragePct =
    questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

  return {
    totalQuestions: questions.length,
    totalAnswered,
    totalCorrect,
    missedCount,
    accuracy,
    starredCount,
    coveragePct,
    topicCounts,
    domainProgress,
    attemptsCount: (progress?.examHistory || []).length
  };
}

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Rearranges (shuffles) the answer choices of a question and re-indexes labels A, B, C...
 * so users cannot rely on memorized answer letter patterns.
 */
export function shuffleQuestionChoices(question) {
  const shuffledOpts = shuffleArray(question.options).map((opt, idx) => ({
    ...opt,
    originalLabel: opt.originalLabel || opt.label,
    label: OPTION_LABELS[idx] || opt.label
  }));

  let matchingPairs = question.matchingPairs;
  let matchingTargets = question.matchingTargets;

  if (question.isMatching && Array.isArray(question.matchingPairs)) {
    const arrowRegex = /\s*(?:→|->)\s*/;
    matchingPairs = shuffledOpts.map((o) => {
      const parts = o.text.split(arrowRegex);
      return {
        label: o.label,
        originalLabel: o.originalLabel || o.label,
        prompt: parts.slice(0, -1).join(' → ').trim(),
        answer: parts[parts.length - 1].trim()
      };
    });
    matchingTargets = shuffleArray(matchingPairs.map((p) => p.answer));
  }

  return {
    ...question,
    options: shuffledOpts,
    ...(question.isMatching ? { matchingPairs, matchingTargets } : {})
  };
}

export function prepareSessionQuestions(
  questionList,
  { shuffleQuestions = false, shuffleChoices = false } = {}
) {
  let prepared = [...questionList];
  if (shuffleQuestions) {
    prepared = shuffleArray(prepared);
  }
  prepared = prepared.map((q) => {
    if (shuffleChoices) {
      return shuffleQuestionChoices(q);
    }
    if (q.isMatching && Array.isArray(q.matchingPairs)) {
      return {
        ...q,
        matchingTargets: shuffleArray(q.matchingPairs.map((p) => p.answer))
      };
    }
    return q;
  });
  return prepared;
}

export const origLabel = (opt) => opt.originalLabel || opt.label;

/** Converts a live session into a storable snapshot keyed by question id + original option labels. */
export function serializeSession(session, idx = 0) {
  const order = [];
  const choices = {};
  const answers = {};
  const checked = {};
  const flagged = {};
  session.questions.forEach((q, i) => {
    order.push(q.id);
    choices[q.id] = q.options.map(origLabel);
    const ans = session.userAnswers[i] || [];
    if (ans.length) {
      if (q.isMatching) {
        answers[q.id] = ans;
      } else {
        answers[q.id] = ans.map((l) => {
          const o = q.options.find((x) => x.label === l);
          return o ? origLabel(o) : l;
        });
      }
    }
    if (session.checked[i]) checked[q.id] = true;
    if (session.flagged[i]) flagged[q.id] = true;
  });
  return {
    order,
    choices,
    answers,
    checked,
    flagged,
    idx,
    shuffled: !!session.shuffled,
    updatedAt: Date.now()
  };
}

/** Rebuilds session questions/answers from a snapshot (order, choice order and answers preserved). */
export function restoreSession(saved, allQuestions) {
  const byId = new Map(allQuestions.map((q) => [q.id, q]));
  const questions = [];
  const arrowRegex = /\s*(?:→|->)\s*/;

  saved.order.forEach((id) => {
    const base = byId.get(id);
    if (!base) return;
    const byOrig = new Map(base.options.map((o) => [origLabel(o), o]));
    const wanted = saved.choices?.[id] || base.options.map(origLabel);
    let opts = wanted.map((l) => byOrig.get(l)).filter(Boolean);
    if (opts.length !== base.options.length) opts = base.options;
    const rebuiltOpts = opts.map((o, i) => ({
      ...o,
      originalLabel: origLabel(o),
      label: OPTION_LABELS[i] || o.label
    }));

    let extra = {};
    if (base.isMatching) {
      const matchingPairs = rebuiltOpts.map((o) => {
        const parts = o.text.split(arrowRegex);
        return {
          label: o.label,
          originalLabel: o.originalLabel,
          prompt: parts.slice(0, -1).join(' → ').trim(),
          answer: parts[parts.length - 1].trim()
        };
      });
      extra = {
        matchingPairs,
        matchingTargets: shuffleArray(matchingPairs.map((p) => p.answer))
      };
    }

    questions.push({
      ...base,
      options: rebuiltOpts,
      ...extra
    });
  });

  const userAnswers = {};
  const checked = {};
  const flagged = {};
  questions.forEach((q, i) => {
    const ans = saved.answers?.[q.id];
    if (ans && ans.length) {
      if (q.isMatching) {
        userAnswers[i] = ans;
      } else {
        userAnswers[i] = ans
          .map((l) => q.options.find((o) => origLabel(o) === l)?.label)
          .filter(Boolean);
      }
    }
    if (saved.checked?.[q.id]) checked[i] = true;
    if (saved.flagged?.[q.id]) flagged[i] = true;
  });
  return { questions, userAnswers, checked, flagged };
}

export function isQuestionAnswerCorrect(question, userLabels = []) {
  if (question.isMatching && Array.isArray(question.matchingPairs)) {
    if (userLabels.length !== question.matchingPairs.length) return false;
    return question.matchingPairs.every((pair) => {
      const expected = `${pair.label}:${pair.answer}`;
      return userLabels.includes(expected);
    });
  }

  const correctLabels = question.options
    .filter((o) => o.isCorrect)
    .map((o) => o.label)
    .sort();
  const userSorted = [...userLabels].sort();
  if (correctLabels.length !== userSorted.length) return false;
  return correctLabels.every((val, idx) => val === userSorted[idx]);
}

export function formatTimerDisplay(seconds) {
  const safeSecs = Math.max(0, seconds);
  const mins = Math.floor(safeSecs / 60);
  const secs = safeSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Non-throwing validator used by the Admin upload form.
 * Returns { errors: string[], warnings: string[] } — errors block saving, warnings are advisory.
 */
export function validateExamQuestions(rawJson) {
  const errors = [];
  const warnings = [];
  const list = Array.isArray(rawJson)
    ? rawJson
    : rawJson && Array.isArray(rawJson.questions)
    ? rawJson.questions
    : null;

  if (!list) {
    errors.push('Expected a JSON array of questions (or an object with a "questions" array).');
    return { errors, warnings };
  }

  const seenIds = new Map();
  const MAX_LISTED = 12;
  const pushLimited = (bucket, msg, counter) => {
    counter.n += 1;
    if (counter.n <= MAX_LISTED) bucket.push(msg);
    else if (counter.n === MAX_LISTED + 1) bucket.push('…and more. Fix the issues above first.');
  };
  const errCounter = { n: 0 };
  const warnCounter = { n: 0 };

  list.forEach((q, idx) => {
    const n = idx + 1;
    if (!q || typeof q !== 'object') {
      pushLimited(errors, `Q${n}: not a valid object.`, errCounter);
      return;
    }
    const text = String(q.question || q.text || '').trim();
    if (!text) pushLimited(errors, `Q${n}: missing "question" text.`, errCounter);

    const opts = Array.isArray(q.options) ? q.options : [];
    const hasPairs = Array.isArray(q.pairs) && q.pairs.length >= 2;
    if (!hasPairs && opts.length < 2) {
      pushLimited(errors, `Q${n}: needs at least 2 options.`, errCounter);
      return;
    }

    if (!hasPairs) {
      const emptyOpt = opts.findIndex((o) => !String(o?.text ?? o?.value ?? '').trim());
      if (emptyOpt !== -1) {
        pushLimited(errors, `Q${n}: option ${emptyOpt + 1} has empty text.`, errCounter);
      }
      const correct = opts.filter((o) => o && o.isCorrect).length;
      if (correct === 0) {
        pushLimited(errors, `Q${n}: no option is marked "isCorrect": true.`, errCounter);
      }
      if (typeof q.isMultiple === 'boolean' && q.isMultiple !== (correct > 1) && correct > 0) {
        pushLimited(
          warnings,
          `Q${n}: isMultiple is ${q.isMultiple} but ${correct} correct option(s) are marked.`,
          warnCounter
        );
      }
    }

    if (q.id !== undefined && q.id !== null) {
      const key = String(q.id);
      if (seenIds.has(key)) {
        pushLimited(errors, `Q${n}: duplicate id "${key}" (also used by Q${seenIds.get(key)}).`, errCounter);
      } else {
        seenIds.set(key, n);
      }
    }

    if (!String(q.explanation || '').trim()) {
      pushLimited(warnings, `Q${n}: no explanation.`, warnCounter);
    }
  });

  return { errors, warnings };
}
