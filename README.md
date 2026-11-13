# ServiceNow Mainline Mock Exams & Study Hub (React.js)

A modular **React.js + Vite** web application for candidates preparing for **ServiceNow Mainline Certifications** (**CAD**, **CSA**, **CIS-ITSM**, **CIS-DF**, **CIS-Discovery**, **CIS-SPM**, and custom JSON exam modules).

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📦 Bundled Certification Modules (`src/data/exams/`)

| Code | Certification Module | Questions |
| :--- | :--- | :---: |
| **CAD** | Certified Application Developer | 219 |
| **CSA** | Certified System Administrator | 408 |
| **CIS-ITSM** | Certified Implementation Specialist – IT Service Management | 242 |
| **CIS-DF** | Certified Implementation Specialist – Data Foundations (CMDB & CSDM) | 250 |
| **CIS-SPM** | Certified Implementation Specialist – Strategic Portfolio Management | 182 |
| **CIS-DISCOVERY** | Certified Implementation Specialist – Discovery | 122 |

---

## 🎯 Features & Modes

### 1. Practice & Exam Simulation Modes
- **⏱️ Timed 60-Q Exam Simulator**: 60 randomized questions, strict 90-minute countdown timer, 70% passing grade threshold, and automatic reload/resume persistence.
- **⚡ Quick 20 Drill**: 20 rapid-fire questions with immediate answer checks and explanations.
- **⚠️ Mistakes Bank**: Targets only questions you previously answered incorrectly until you reach 100% accuracy.
- **⭐ Starred / Bookmarks Review**: Drill into all questions you flagged for personal revision.
- **🏆 All Questions Marathon**: Work through every question in an exam module sequentially or with **Shuffle Qs & Choices** enabled, with automatic session resume.
- **🎯 Domain & Topic Drills**: Practice specific blueprint domains or drill your weakest domain with one click.

### 2. Interactive Exam Engine
- **Single, Multi-Select & Drag-and-Drop Matching**:
  - Automatic detection of single-choice vs. multi-choice (`Choose 2`, `Choose 3`) with live selection counters and selection caps.
  - Interactive drag-and-drop (and click-to-place) matching workspace for `Prompt → Target` questions.
- **Question Palette**: Interactive sidebar to jump to any question and filter by All / Unanswered / Flagged.
- **Personal Study Notes & Markdown Export**: Auto-saves personal notes per question to `localStorage`, searchable in the Question Bank and exportable as a `.md` study sheet.
- **Admin Portal (`/admin`)**: Upload new `.json` exam sets (single or bulk drag-and-drop) with live schema validation and optional GitHub repository cloud sync via `/api/exams`.
- **Data Backup & Restore**: Export/import all progress, notes, bookmarks, and exam history as `.json`.
- **Dark & Light Mode**: Seamless theme toggle.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `1` - `8` or `A` - `H` | Select option |
| `→` or `N` | Next question |
| `←` or `P` | Previous question |
| `Enter` | Check Answer (Study Mode) |
| `F` | Flag for review in exam |
| `B` | Star / Bookmark question |
| `C` | Clear option selection |
| `?` | Open keyboard shortcuts help |
| `Esc` | Close any open modal |
