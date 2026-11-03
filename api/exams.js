// Vercel Serverless Function: /api/exams
// Syncs uploaded/deleted exam JSON files directly with src/data/exams/*.json in GitHub
// so any exam uploaded in /admin is immediately visible across ALL devices.

function slugifyId(str) {
  return (
    String(str || 'exam')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom-exam'
  );
}

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || '';
  const repo = process.env.GITHUB_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || '';
  const fullRepo = process.env.GITHUB_REPO || (owner && repo ? `${owner}/${repo}` : '');
  const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';

  return { token, fullRepo, branch };
}

async function githubRequest(url, token, options = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ServiceNow-Exam-Hub-Vercel',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const { token, fullRepo, branch } = getGitHubConfig();

  // ---------------------------------------------------------------------------
  // GET /api/exams — Fetch live exam modules from GitHub src/data/exams/*.json
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    if (!fullRepo) {
      return res.status(200).json({
        ok: false,
        configured: false,
        reason: 'GitHub repository environment variables not detected.'
      });
    }

    try {
      const dirUrl = `https://api.github.com/repos/${fullRepo}/contents/src/data/exams?ref=${encodeURIComponent(branch)}`;
      const dirRes = await githubRequest(dirUrl, token);

      if (!dirRes.ok) {
        return res.status(200).json({
          ok: false,
          configured: Boolean(token),
          error: `GitHub API returned ${dirRes.status}`
        });
      }

      const items = await dirRes.json();
      if (!Array.isArray(items)) {
        return res.status(200).json({ ok: true, authoritative: true, exams: [] });
      }

      const jsonFiles = items.filter(
        (item) => item.type === 'file' && item.name.endsWith('.json')
      );

      const exams = await Promise.all(
        jsonFiles.map(async (fileItem) => {
          try {
            // Fetch raw content using download_url or git blob API
            let rawText = '';
            if (fileItem.download_url) {
              const rawRes = await fetch(fileItem.download_url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              if (rawRes.ok) {
                rawText = await rawRes.text();
              }
            }
            if (!rawText && fileItem.url) {
              const blobRes = await githubRequest(fileItem.url, token);
              if (blobRes.ok) {
                const blobJson = await blobRes.json();
                if (blobJson.content) {
                  rawText = Buffer.from(blobJson.content, 'base64').toString('utf-8');
                }
              }
            }
            if (!rawText) return null;

            const raw = JSON.parse(rawText);
            const id = fileItem.name.replace(/\.json$/i, '');

            if (Array.isArray(raw)) {
              return {
                id,
                code: id.toUpperCase(),
                title: `${id.toUpperCase()} Mock Exam`,
                category: 'ServiceNow',
                description: `Uploaded exam module (${raw.length} questions).`,
                fileName: fileItem.name,
                questions: raw
              };
            } else if (raw && Array.isArray(raw.questions)) {
              return {
                ...raw,
                id: raw.id || id,
                fileName: fileItem.name
              };
            }
            return null;
          } catch (err) {
            console.error(`Failed parsing ${fileItem.name}:`, err);
            return null;
          }
        })
      );

      return res.status(200).json({
        ok: true,
        authoritative: true,
        configured: Boolean(token && fullRepo),
        exams: exams.filter(Boolean)
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/exams — Save/Commit uploaded JSON exam to GitHub src/data/exams/
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!token || !fullRepo) {
      return res.status(501).json({
        ok: false,
        configured: false,
        error:
          'GITHUB_TOKEN is not configured in Vercel Environment Variables. Saved to local browser only.'
      });
    }

    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const questions = Array.isArray(payload) ? payload : payload.questions;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res
          .status(400)
          .json({ ok: false, error: 'Questions array is required and cannot be empty.' });
      }

      const examCode = (payload.code || payload.id || 'EXAM').toString().trim().toUpperCase();
      const examId = slugifyId(
        payload.id || payload.code || payload.title || `exam-${Date.now()}`
      );
      const fileName = `${examId}.json`;
      const filePath = `src/data/exams/${fileName}`;

      const examData = {
        id: examId,
        code: examCode,
        title: payload.title || `${examCode} Certification Mock Exam`,
        category: payload.category || 'ServiceNow Certification',
        description:
          payload.description ||
          `Practice and master ${questions.length} verified questions for ${examCode}.`,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions
      };

      const fileUrl = `https://api.github.com/repos/${fullRepo}/contents/${filePath}`;

      // Check if file already exists to get its SHA for updating
      let existingSha = null;
      const checkRes = await githubRequest(
        `${fileUrl}?ref=${encodeURIComponent(branch)}`,
        token
      );
      if (checkRes.ok) {
        const existingData = await checkRes.json();
        existingSha = existingData.sha || null;
      }

      const contentBase64 = Buffer.from(JSON.stringify(examData, null, 2), 'utf-8').toString(
        'base64'
      );

      const putBody = {
        message: `chore(exams): upload ${examCode} (${fileName}) via Admin Portal`,
        content: contentBase64,
        branch,
        ...(existingSha ? { sha: existingSha } : {})
      };

      const putRes = await githubRequest(fileUrl, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        return res.status(putRes.status).json({
          ok: false,
          error: `GitHub commit failed (${putRes.status}): ${errText}`
        });
      }

      return res.status(200).json({
        ok: true,
        fileName,
        filePath,
        exam: examData
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/exams?id=<id> — Delete exam JSON file from GitHub src/data/exams/
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!token || !fullRepo) {
      return res.status(501).json({
        ok: false,
        configured: false,
        error: 'GITHUB_TOKEN is not configured in Vercel Environment Variables.'
      });
    }

    try {
      const rawId =
        req.query?.id || req.url.split('?')[0].replace(/^\/api\/exams\/?/, '') || '';
      const safeId = slugifyId(decodeURIComponent(rawId));
      const filePath = `src/data/exams/${safeId}.json`;
      const fileUrl = `https://api.github.com/repos/${fullRepo}/contents/${filePath}`;

      const checkRes = await githubRequest(
        `${fileUrl}?ref=${encodeURIComponent(branch)}`,
        token
      );
      if (!checkRes.ok) {
        return res.status(404).json({ ok: false, error: 'Exam file not found in repository.' });
      }

      const existingData = await checkRes.json();
      const delRes = await githubRequest(fileUrl, token, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `chore(exams): delete ${safeId}.json via Admin Portal`,
          sha: existingData.sha,
          branch
        })
      });

      if (!delRes.ok) {
        const errText = await delRes.text();
        return res.status(delRes.status).json({
          ok: false,
          error: `GitHub delete failed (${delRes.status}): ${errText}`
        });
      }

      return res.status(200).json({ ok: true, deleted: safeId });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

