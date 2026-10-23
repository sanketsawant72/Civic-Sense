# CivicSense

Civic issue reporting and complaint management for Ashta, Maharashtra. The app uses a React/Vite frontend, an Express API, and a local MongoDB database. The optional AI image-classification service runs separately.

## Run locally on Windows

Install Node.js and MongoDB Community Server, then start the MongoDB service. From the project root in PowerShell:

```powershell
npm install
npm install --prefix server
Copy-Item server\.env.example server\.env
```

Edit `server\.env` and replace the `JWT_SECRET` placeholder with a private value. Generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The default `MONGO_URI` is `mongodb://127.0.0.1:27017/civicsense`. The API explicitly loads `server\.env` and fails to start if MongoDB or the JWT secret is unavailable.

Start the local frontend and API. This creates/resets only the local admin and department logins before starting; it does not alter complaints:

```powershell
npm run dev:local
```

Alternatively, set up accounts separately with `npm run setup:local`, then start the app with `npm run dev:no-ai`.

```powershell
npm run dev:no-ai
```

Open **http://localhost:5173**. To run the optional AI image service too, install Python 3.10+ and run `npm run dev:full`; its first start installs the packages in `ai-service\requirements.txt`. Run `npm run setup:local` first if you have not already created local accounts.

## Local login accounts

All seven department accounts use the local development password `Dept@1234`:

| Department | Email |
|---|---|
| Public Works | `pwd@civicsense.in` |
| Sanitation | `sanitation@civicsense.in` |
| Drainage & Sewage | `drainage@civicsense.in` |
| Water Supply | `water@civicsense.in` |
| Electrical | `electrical@civicsense.in` |
| Town Planning | `planning@civicsense.in` |
| General Administration | `general@civicsense.in` |

Local admin: `admin@civicsense.in` / `Admin@1234`. Citizens create their own account from the registration page.

These fixed credentials are for local development only. Do not expose them or the local `.env` file in a public deployment.

## Database and data

Accounts and complaints are read from and written to the local MongoDB database; the frontend does not fall back to in-memory sample records. Running `npm run setup:local` creates or updates only the local admin and department accounts. It does not delete or seed complaint records. New complaints are saved to MongoDB.
