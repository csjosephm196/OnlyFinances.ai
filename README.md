# OnlyFinances.ai

**AI-powered financial dashboard** — categorize transactions, visualize spending, forecast cash flow, and chat with an AI advisor. Built for **HackHive 2026**.

---

## Features

| Feature | Description |
|--------|-------------|
| **Dashboard** | Total spending, transactions, categories, income statement. Toggle between transaction and income-statement views. |
| **Transaction Classifier** | Upload CSV bank statements. AI categorizes transactions. Choose **Replace** or **Add to Existing** (merge). Confetti on success. |
| **Balance Sheet & Income Statement** | Upload CSVs for balance sheet and income statement. Stored in Firebase. |
| **Cash Flow Forecaster** | 90-day probabilistic forecast, runway, safety buffer. |
| **Financial Calendar** | Calendar tied to your data. Expenses (red), revenues (green), both (indigo). Click dates for transaction history and future projections. |
| **AI Advisor** | Chat with an AI financial advisor. Preprompts and suggested questions. Optional **text-to-speech** (ElevenLabs) for spoken responses. |
| **Asset Valuator** | Track and value assets. |
| **PDF Export** | Export transaction and income statement reports as PDF (jsPDF + html2canvas). |
| **Firebase** | Auth (Email/Password, Google). Firestore for budgets, balance sheets, income statements. |

---

## Project Structure

```
HackHive-2026/
├── Frontend/              # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/    # Layout, FiscalCore, Layer2Forecaster, Layer3Advisor, etc.
│   │   ├── context/       # BudgetContext (Firebase sync)
│   │   ├── hooks/         # useAuth, useSearch
│   │   ├── lib/           # Firebase, Firestore
│   │   ├── services/      # budgetApi, advisorApi, ttsService, pdfExportService
│   │   └── types/         # budget, advisor, balanceSheet, incomeStatement
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── Backend/               # FastAPI + Gemini
│   ├── app/
│   │   ├── api/v1/        # /process, /forecast, /advise, /process-balance-sheet, etc.
│   │   ├── core/          # config
│   │   └── services/ai/   # categorizer, forecaster, advisor
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── render.yaml            # Backend deployment (Render)
└── README.md              # This file
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

### 1. Clone

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
```

Edit `.env`: set `GEMINI_API_KEY`. Optionally set `ALLOWED_ORIGINS` and `DEBUG`.

```bash
python -m uvicorn app.main:app --reload --port 8000
```

- API: **http://localhost:8000**
- Docs: **http://localhost:8000/docs**

---

### 3. Frontend

**Important:** Install and run from the `Frontend/` directory. The root `package.json` does not include frontend deps (e.g. `jspdf`, `html2canvas`).

```bash
cd Frontend
npm install
cp .env.example .env
```

Edit `.env`: add your Firebase config. Optionally add ElevenLabs keys for TTS.

```bash
npm run dev
```

- App: **http://localhost:3000** (Vite is configured for port 3000)

---

## Backend API

The Frontend calls a **Backend API** for processing CSVs, forecasting, and the advisor. By default it uses:

- **https://demo-backend-bqyy.onrender.com**

To use your local Backend, you’d need to point the Frontend (e.g. via env or config) to `http://localhost:8000`. See `Frontend/src/services/budgetApi.ts` and `advisorApi.ts` for the base URLs.

---

## Environment Variables

### Frontend (`Frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics | No |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key (TTS) | No |
| `VITE_ELEVENLABS_VOICE_ID` | ElevenLabs voice ID (TTS) | No |

Use `Frontend/.env.example` as a template.

### Backend (`Backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `ALLOWED_ORIGINS` | CORS origins (e.g. `http://localhost:3000`) | No |
| `DEBUG` | Debug mode | No |

Use `Backend/.env.example` as a template.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, Motion, Firebase, jsPDF, html2canvas, canvas-confetti, react-day-picker |
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
| `npm run dev` | Frontend | Start Vite dev server (port 3000) |
| `npm run build` | Frontend | Production build |
| `python -m uvicorn app.main:app --reload --port 8000` | Backend | Run API locally |

---

## Troubleshooting

- **`Failed to resolve import "jspdf"`**  
  Install and run from `Frontend/`: `cd Frontend`, then `npm install` and `npm run dev`. The root `package.json` does not include `jspdf`.

- **CORS errors when calling Backend**  
  Ensure `ALLOWED_ORIGINS` in `Backend/.env` includes your Frontend origin (e.g. `http://localhost:3000`).

---

## Contributing

1. `git pull` latest.
2. Install deps: `npm install` in `Frontend`, `pip install -r requirements.txt` in `Backend`.
3. Create a branch: `git checkout -b feature/your-feature`.
4. Make changes, then push and open a PR.

---

## License

Private – All rights reserved.
