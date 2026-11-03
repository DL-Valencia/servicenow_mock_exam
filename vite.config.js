import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMS_DIR = path.resolve(__dirname, 'src/data/exams');

function ensureExamsDir() {
  if (!fs.existsSync(EXAMS_DIR)) {
    fs.mkdirSync(EXAMS_DIR, { recursive: true });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function slugifyId(str) {
  return String(str || 'exam')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-exam';
}

function examStoragePlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/exams', async (req, res, next) => {
      ensureExamsDir();
      res.setHeader('Content-Type', 'application/json');

      try {
        // GET /api/exams - list all JSON files in src/data/exams
        if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
          const files = fs.readdirSync(EXAMS_DIR).filter((f) => f.endsWith('.json'));
          const exams = [];
          for (const file of files) {
            try {
              const filePath = path.join(EXAMS_DIR, file);
              const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              const id = path.basename(file, '.json');
              if (Array.isArray(raw)) {
                exams.push({
                  id,
                  code: id.toUpperCase(),
                  title: `${id.toUpperCase()} Mock Exam`,
                  category: 'ServiceNow',
                  description: `Uploaded exam module (${raw.length} questions).`,
                  fileName: file,
                  questions: raw
                });
              } else if (raw && Array.isArray(raw.questions)) {
                exams.push({
                  ...raw,
                  id: raw.id || id,
                  fileName: file
                });
              }
            } catch (e) {
              console.error(`Failed reading exam file ${file}:`, e);
            }
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, exams }));
          return;
        }

        // POST /api/exams - save an uploaded JSON exam into src/data/exams/<id>.json
        if (req.method === 'POST' && (req.url === '/' || req.url === '')) {
          const payload = await readJsonBody(req);
          const questions = Array.isArray(payload) ? payload : payload.questions;

          if (!Array.isArray(questions) || questions.length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Questions array is required and cannot be empty.' }));
            return;
          }

          const examCode = (payload.code || payload.id || 'EXAM').toString().trim().toUpperCase();
          const examId = slugifyId(payload.id || payload.code || payload.title || `exam-${Date.now()}`);
          const fileName = `${examId}.json`;
          const filePath = path.join(EXAMS_DIR, fileName);

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

          fs.writeFileSync(filePath, JSON.stringify(examData, null, 2), 'utf-8');

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: true,
              fileName,
              filePath: `src/data/exams/${fileName}`,
              exam: examData
            })
          );
          return;
        }

        // DELETE /api/exams/:id - delete exam JSON file from src/data/exams
        if (req.method === 'DELETE') {
          const reqId = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
          const safeId = slugifyId(reqId);
          const filePath = path.join(EXAMS_DIR, `${safeId}.json`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, deleted: safeId }));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'Exam file not found on disk.' }));
          }
          return;
        }

        next();
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  };

  return {
    name: 'vite-plugin-exam-folder-storage',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    }
  };
}

export default defineConfig({
  plugins: [react(), examStoragePlugin()],
  server: {
    port: 5173,
    open: false
  }
});
