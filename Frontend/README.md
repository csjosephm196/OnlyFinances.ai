# SovereignCFO - AI-Powered Financial Dashboard

An intelligent financial management dashboard that uses AI to automatically categorize transactions and provide spending insights.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Architectprototypesovereigncfo2.git
   cd Architectprototypesovereigncfo2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser** to `http://localhost:3000`

---

## 🔥 Firebase Configuration

This project uses Firebase for authentication and data storage. The Firebase SDK is already included in `package.json`.

### Firebase Services Used

| Service | Purpose |
|---------|---------|
| **Authentication** | User sign-in (Email/Password, Google) |
| **Firestore** | Store transaction data |
| **Analytics** | Usage tracking (optional) |

### Setting Up Your Own Firebase Project

If you need to use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Register a web app and copy the config
4. Update the config in `src/lib/firebase.ts`

### Enabling Authentication (Required)

Before users can sign in, you must enable auth providers in Firebase Console:

1. Go to **Build → Authentication → Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (optional, for Google sign-in)

### Setting Up Firestore (Required for data storage)

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Start in **test mode** for development

---

## 📁 Project Structure

```
src/
├── components/        # React components
│   ├── LoginPage.tsx  # Authentication UI
│   ├── Layout.tsx     # Main app layout
│   └── charts/        # Chart components
├── hooks/
│   └── useAuth.ts     # Firebase auth hook
├── lib/
│   ├── firebase.ts    # Firebase initialization
│   └── firestore.ts   # Firestore utilities
├── services/
│   └── budgetApi.ts   # API integration
└── App.tsx            # Main app entry
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |

---

## 🔧 Tech Stack

- **React** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Database
- **Recharts** - Data visualization
- **Lucide React** - Icons

---

## 📝 Environment Variables (Optional)

If you want to use environment variables for Firebase config:

1. Create a `.env` file in the root directory
2. Add your Firebase config:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your-app-id
   ```

---

## 🤝 Contributing

1. Pull the latest changes: `git pull`
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Push and create a PR

---

## 📄 License

Private - All rights reserved