# HCM Lite — Local Windows & Cloud Setup Guide

## 1. Prerequisites
- Node.js 20+ installed
- Windows PowerShell or Command Prompt
- MongoDB Atlas account (free cluster) or local MongoDB instance

---

## 2. Local Windows Setup via PowerShell

Open Windows PowerShell in the unzipped folder:

```powershell
# 1. Inspect directory
Get-ChildItem

# 2. Copy environment template
Copy-Item .env.example .env

# 3. Open .env in Notepad to configure your secrets
notepad .env
```

### Required `.env` Keys:
```env
# MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/hcm_lite?retryWrites=true&w=majority"

# Gemini AI API Key
GEMINI_API_KEY="AIzaSy..."

# JWT secret (min 32 characters)
JWT_SECRET="your_strong_32_character_jwt_secret_key"

# Port (defaults to 3000)
PORT=3000

# Initial Super Admin Bootstrap Email
INITIAL_ADMIN_EMAIL="asadqadri239@gmail.com"
```

```powershell
# 4. Install dependencies
npm install

# 5. Start the full-stack application (runs Express backend + Vite client on port 3000)
npm run dev
```

The application will be accessible at:
👉 `http://localhost:3000`

---

## 3. MongoDB Atlas Configuration Steps
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a free **M0 Sandbox** cluster in any region.
3. Under **Security > Database Access**:
   - Click **Add New Database User**.
   - Create a user with Username and Password (Password authentication).
   - Assign `Read and write to any database` privileges.
4. Under **Security > Network Access**:
   - Click **Add IP Address**.
   - For development, select **Allow Access from Anywhere** (`0.0.0.0/0`) or your current IP.
5. Under **Deployments > Database**:
   - Click **Connect > Drivers**.
   - Copy the SRV URI: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/hcm_lite?retryWrites=true&w=majority`.
   - Replace `<password>` with your database user password and paste into `.env`.

---

## 4. Google AI Studio Secrets vs Local `.env`

| Secret Name | Local Windows Setup (`.env`) | Google AI Studio Environment |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Set in local `.env` | Set via **Settings > Secrets** panel |
| `MONGODB_URI` | Set in local `.env` | Set via Secrets panel or runs in resilient in-memory mode |
| `JWT_SECRET` | Set in local `.env` | Automatically managed with fallback default |
| `INITIAL_ADMIN_EMAIL` | Set in local `.env` | Defaults to `asadqadri239@gmail.com` |

---

## 5. Troubleshooting & Diagnostics

- **Database Connection Notice**:
  Click the **Database Health** button in the top navigation bar to inspect real-time connection status (`atlas` or `memory`), host, and database name.
- **Port 3000 in use**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  ```
- **Gemini AI Timeout / Missing Key**:
  If `GEMINI_API_KEY` is not provided, HCM Lite falls back gracefully to deterministic rule-based analysis and documented policies.
