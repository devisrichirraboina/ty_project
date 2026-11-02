# AlphaCare – AI-Based Child Stress Monitoring & Early Intervention System

AlphaCare is an integrated full-stack cross-platform application designed for children and teenagers (aged 10–18), parents, school counselors, and administrators. It provides psychological stress risk stratification, conversational coping support, evidence-based wellness activities, secure longitudinal recovery progress tracking, and clinical communication.

---

## 1. System Architecture & Tech Stack

- **Client Application**: React Native (v0.81.5), Expo (v54), React (v19.1.0), React Native Web, React Navigation v7.
- **Backend API Server**: Node.js, Express.js (v5.2.1), CORS, Dotenv, Google Generative AI SDK.
- **Database & Authentication**: Supabase (PostgreSQL with Row Level Security, Supabase Auth with JWT).
- **AI Integration**: OpenRouter API (`openrouter/free` model router) with non-diagnostic empathetic prompt guardrails and PII scrubbing.
- **Storage**: AsyncStorage (client-side offline session cache).

---

## 2. Prerequisites

- **Node.js**: v18.x or v20.x LTS
- **npm**: v9.x or v10.x
- **Supabase Account / Project**: PostgreSQL database instance with Auth enabled.
- **OpenRouter API Key**: (Optional for AI fallback, required for live external LLM inference).

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in both root and `backend/` directories.

```bash
cp .env.example .env
cp .env.example backend/.env
```

### Client (`.env` in Root)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Server (`backend/.env`)
```env
PORT=3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openrouter/free
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000
```

> **Security Notice**: All sensitive API keys (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `FCM_SERVER_KEY`) MUST remain backend-only. Never expose them to public client bundles.

---

## 4. Database Setup & Migrations

Execute the SQL migration scripts sequentially in the Supabase SQL Editor:

1. `supabase/migrations/001_questionnaire_responses.sql` — Initial psychological stress questionnaire telemetry.
2. `supabase/migrations/002_parent_counselor_modules.sql` — Core RBAC tables: `child_profiles`, `parent_profiles`, `counselor_profiles`, `counselor_child_assignments`, `counseling_session_notes`, `appointments`, `recommendations`.
3. `supabase/migrations/003_counselor_messages.sql` — 1-on-1 counseling messaging logs with timestamps.
4. `supabase/migrations/004_counselor_reports_referrals.sql` — Formal referrals and clinical summaries.
5. `supabase/migrations/005_notifications_m10.sql` — In-app notification center table with read tracking.
6. `supabase/migrations/006_consent_privacy_security_m11.sql` — Guardian consent records and audit logs.
7. `supabase/migrations/007_wellness_activities_progress_m12.sql` — Wellness activity catalog and completion logs.

---

## 5. Running the Project Locally

### Step 1: Start the Backend Server
```bash
cd backend
npm install
npm start
```
The server will start on port `3000`. Test health status:
```bash
curl http://localhost:3000/health
# Response: {"status":"healthy","system":"AlphaCare...","uptime":...}
```

### Step 2: Start the Frontend Application
In a separate terminal from project root:
```bash
npm install
npx expo start
```
- Press **`w`** to open in web browser (Chrome, Edge, Safari, Firefox).
- Or scan QR code via Expo Go app on iOS/Android.

---

## 6. End-to-End Role Workflows

- **Child**:
  1. Register/Login as Child.
  2. Complete Mood Check-in on Dashboard.
  3. Launch Wellness Check-in (M6 Psychometric Questionnaire).
  4. Chat with empathetic AI Buddy (M7 OpenRouter).
  5. Practice guided activities in Stress Busters (M12 Breathing, Memory, Color Calm, Zen Garden, Bubble Break).
  6. Track longitudinal Recovery & Intervention Progress.
- **Parent**:
  1. Login as Parent.
  2. View linked children wellness overviews without exposing private diary text.
  3. Submit confidential Bullying / Safety Incident reports.
  4. Manage guardian consent policies (M11) and export PDF wellness reports (M8).
- **Counselor**:
  1. Register as Counselor (reviewed and approved via Admin portal).
  2. Review assigned student caseload and clinical risk tiers.
  3. Conduct 1-on-1 chat and schedule appointment check-ins.
  4. Document clinical session notes and formal referrals.
- **Admin**:
  1. Login via `admin@alphacare.com`.
  2. View platform-wide aggregated telemetry and stress distribution.
  3. Approve or reject registered counselors.

---

## 7. Production Deployment Instructions

### Backend (Node.js / Express)
- Compatible with Render, Railway, AWS App Runner, Heroku, or Docker container.
- Build command: `npm install`
- Start command: `npm start`
- Ensure environment variables (`PORT`, `OPENROUTER_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`) are set in your hosting dashboard.

### Frontend Web (Expo Web Export)
- Generate optimized static production bundle:
  ```bash
  npx expo export --platform web
  ```
- Deploy the resulting `dist/` directory to Vercel, Netlify, Cloudflare Pages, or AWS S3/CloudFront.
- Set `EXPO_PUBLIC_BACKEND_URL` to your live deployed backend URL.

---

## 8. Common Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `Network request failed` | Backend not running or wrong IP on Android emulator | Ensure `npm start` is active in `backend/`. For Android emulator, use `http://10.0.2.2:3000`. For Web/iOS use `http://localhost:3000` or configure `EXPO_PUBLIC_BACKEND_URL`. |
| OpenRouter fallback active | Missing or invalid `OPENROUTER_API_KEY` | Set valid key in `backend/.env`. The system provides an instant safe empathetic fallback so it never crashes. |
| Counselor shows unapproved | Admin approval required | Log in as `admin@alphacare.com` and click "Approve Doctor". |
| Database query forbidden | Missing authorization token | Ensure you are logged in; all protected endpoints verify Bearer tokens server-side. |