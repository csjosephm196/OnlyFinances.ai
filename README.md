# SovereignCFO – AI-Powered Financial Dashboard

**SovereignCFO** is an intelligent financial management dashboard that uses AI to categorize transactions, visualize spending, forecast cash flow, and provide personalized financial advice. Built for HackHive 2026.

---

## Features

| Feature | Description |
|--------|-------------|
| **Dashboard** | Overview of total spending, transactions, categories, and income statement |
| **Transaction Classifier** | Upload CSV bank statements → AI categorizes transactions (replace or merge with existing data). Confetti on success. |
| **Cash Flow Forecaster** | 90-day probabilistic forecast, runway, safety buffer |
| **Financial Calendar** | Calendar tied to your uploaded data: expenses (red), revenues (green), both (indigo). Click dates to see transaction history and future projections. |
| **AI Advisor** | Chat with an AI financial advisor. Optional **text-to-speech** (ElevenLabs) for spoken responses. Preprompts and suggested questions. |
| **Asset Valuator** | Track and value assets |
| **PDF Export** | Export transaction and income statement reports as PDF |
| **Firebase** | Auth (Email/Password, Google) and Firestore for persisting budgets, balance sheets, income statements |

---

## Project Structure

```
HackHive-2026/
├── Frontend/          # React + Vite + TypeScript app
│   ├── src/
│   │   ├── components/   # UI (Layout, FiscalCore, Layer2Forecaster, Layer3Advisor, etc.)
│   │   ├── context/      # BudgetContext (Firebase sync)
│   │   ├── hooks/        # useAuth
│   │   ├── lib/          # Firebase, Firestore
│   │   ├── services/     # budgetApi, advisorApi, ttsService, pdfExport
│   │   └── types/        # budget, advisor, balanceSheet, incomeStatement
│   ├── .env.example
│   └── package.json
├── Backend/           # FastAPI + Gemini API
│   ├── app/
│   │   ├── api/v1/       # /process, /forecast, /advise, etc.
│   │   ├── core/         # config
│   │   └── services/ai/  # categorizer, forecaster, advisor
│   ├── requirements.txt
│   └── .env.example
├── render.yaml        # Backend deployment (Render)
└── README.md          # This file
```

---

## Quick Start

### Prerequisites

- **Node.js** v18+
- **Python** 3.11+ (for Backend)
- **Firebase** project (Auth + Firestore)
- **Gemini API key** (Backend)
- **ElevenLabs API key** (optional, for AI Advisor TTS)

---

### 1. Clone and install

```bash
git clone https://github.com/csjosephm196/HackHive-2026.git
cd HackHive-2026
```

---

### 2. Backend

```bash
cd Backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set GEMINI_API_KEY (and optionally ALLOWED_ORIGINS, DEBUG)
```

Run locally:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd Frontend
npm install
cp .env.example .env
# Edit .env with Firebase config and (optional) ElevenLabs keys
```

Run locally:

```bash
npm run dev
```

- App: `http://localhost:5173` (or the port Vite prints)

---

## Environment Variables

### Frontend (`.env` in `Frontend/`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics (optional) | No |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key (for TTS) | No |
| `VITE_ELEVENLABS_VOICE_ID` | ElevenLabs voice ID (for TTS) | No |

See `Frontend/.env.example` for a template.

### Backend (`.env` in `Backend/`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `ALLOWED_ORIGINS` | CORS origins (e.g. `http://localhost:5173`) | No |
| `DEBUG` | Debug mode | No |

See `Backend/.env.example` for a template.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, Motion, Firebase, canvas-confetti, react-day-picker |
| **Backend** | FastAPI, Google Gemini 2.5 Flash, Pydantic |
| **Auth & DB** | Firebase Authentication, Firestore |
| **Optional** | ElevenLabs (TTS for AI Advisor) |

---

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → Enable **Email/Password** (and optionally **Google**).
3. **Firestore** → Create database (test mode is fine for dev).
4. **Project settings** → Your apps → Add web app → Copy config into `Frontend/.env` as `VITE_*` variables.

---

## Scripts

| Command | Where | Description |
|---------|--------|-------------|
| `npm run dev` | Frontend | Start Vite dev server |
| `npm run build` | Frontend | Production build |
| `python -m uvicorn app.main:app --reload --port 8000` | Backend | Run API locally |

---

## Contributing

1. `git pull` latest.
2. Install deps: `npm install` in Frontend, `pip install -r requirements.txt` in Backend.
3. Create a branch: `git checkout -b feature/your-feature`.
4. Make changes, then push and open a PR.

---

## License

Private – All rights reserved.
