# ServiceNow CAD Mock Exam & Study Hub (React.js)

A modular **React.js + Vite** web application designed for candidates preparing for the **ServiceNow Certified Application Developer (CAD)** certification exam.

Contains all **229 verified practice questions** categorized across the official CAD examination blueprint domains.

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

## 🎯 Features & Modes

### 1. Practice & Exam Simulation Modes
- **⏱️ Timed CAD Exam Simulator**: 60 randomized questions, strict 90-minute countdown timer, realistic 70% passing grade requirement.
- **⚡ Quick 20 Drill**: 20 rapid-fire questions with immediate answer checks and explanations.
- **📚 Set 3 Reviewer (63 Qs)**: Comprehensive practice of official CAD Set 3 (Parts 1 & 2).
- **🚀 Set 4 Reviewer (78 Qs)**: Advanced developer practice of official CAD Set 4 (Parts 1 & 2).
- **⚠️ Weak-Spot Mistakes Bank**: Targets only questions you previously answered incorrectly until you reach 100% accuracy.
- **⭐ Starred / Bookmarks Review**: Drill into all questions you flagged for personal revision.
- **🏆 All 229 Marathon**: Work through all 229 questions in sequence.

### 2. Learning Domain Categorization
Filter and practice questions across the 7 official CAD domains:
1. **Scripting & APIs** (GlideRecord, GlideSystem, g_form, g_scratchpad, Client Scripts, Business Rules)
2. **Data Model & Import** (Tables, Inherited Fields, Coalescing, Transform Maps, Schema Maps)
3. **Application Security** (Access Controls / ACL evaluation order, Roles, Protection Policies)
4. **Application Fundamentals** (Update Sets, Studio, Application Repository, Guided App Creator)
5. **Application Lifecycle & Git** (Source Control linking, Branches, Stashing, Tags)
6. **Application Design & UI** (Form Designer, UI Policies, UI Actions, Modules, Record Producers)
7. **Flows & Integrations** (Flow Designer triggers, Integration Hub, Spokes, Events)

### 3. Interactive Exam Engine
- **Single & Multiple Choice Detection**: Clear badges indicating single selection vs. multi-select (e.g., "Choose 2", "Choose 3").
- **Question Palette**: Interactive sidebar to jump to any question, filter by All / Unanswered / Flagged.
- **Study Notes**: Auto-saves personal notes per question directly to browser local storage.
- **Performance Diagnostics**: Visual score breakdown by domain, pass/fail status, review correct vs. incorrect answers.
- **Data Backup & Restore**: Export your progress, notes, and exam history to a `.json` backup file or import it on another device.
- **Dark & Light Mode**: Seamless theme toggle.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `1` - `5` or `A` - `E` | Select option |
| `→` or `N` | Next question |
| `←` or `P` | Previous question |
| `Enter` | Check Answer (Study Mode) |
| `F` | Flag for review in exam |
| `B` | Star / Bookmark question |
| `C` | Clear option selection |
| `?` | Open keyboard shortcuts help |
| `Esc` | Close any open modal |

---

## 📁 Project Structure

```
├── index.html                  # Vite HTML entry
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
├── questions.json              # Master 229 questions dataset
├── exam_data/                  # Original CAD mock PDF materials
└── src/
    ├── main.jsx                # React root entry point
    ├── App.jsx                 # App shell & view routing
    ├── context/
    │   └── ExamContext.jsx     # Global exam state, timer, history, & localStorage persistence
    ├── hooks/
    │   └── useKeyboardShortcuts.js # Keyboard navigation hook
    ├── utils/
    │   └── examHelpers.js      # Grading, formatting, and storage utilities
    ├── data/
    │   └── questions.json      # 229 CAD questions imported by React
    ├── components/
    │   ├── layout/             # Sidebar, Header, Toast
    │   ├── dashboard/          # DashboardView, HeroBanner, StatsStrip, PracticeModesGrid, DomainBreakdown, ExamHistoryTable
    │   ├── session/            # SessionView, SessionHeader, QuestionCard, QuestionPalette, StudyNotesBox
    │   ├── results/            # ResultsView, ResultsReviewList
    │   ├── bank/               # QuestionBankView, BankQuestionItem
    │   └── modals/             # ConfirmModal, ShortcutsModal, DataBackupModal
    └── styles/
        ├── variables.css       # Theme design tokens (Light & Dark)
        ├── layout.css          # App shell, sidebar, header, responsive breakpoints
        └── components.css      # Component styles
```
