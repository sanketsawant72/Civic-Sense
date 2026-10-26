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

The landing page is for citizens. Staff sign-in portals are available directly at `/admin/login` and `/department/login`; the citizen sign-in is `/login`.

When a photo is added, the app reads GPS coordinates from its metadata when available. If it has no saved GPS, the reporter chooses whether it was taken at their current location or somewhere else; the current-location choice asks for browser permission, while the other-location choice opens a map to pin the photo's location. Device GPS requires a secure HTTPS origin (localhost is also allowed), and mobile browsers may also require location services to be enabled. An older or forwarded image without GPS metadata cannot reveal where it was originally taken from image pixels alone.

Before a report is saved, the API checks active complaints in the same category within 100 meters. It compares title and description using word overlap; likely matches are shown as a warning, and citizens can still choose to submit.

If the optional AI service is offline, reports can still be submitted with a photo. The photo is attached but not marked as AI-verified, and the reporter chooses the issue category manually. The default YOLO model is not trained for civic issues; reliable civic photo verification requires deploying the AI service and providing civic-issue model weights as described in [ai-service/README.md](./ai-service/README.md).

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

### Provision production admin and department accounts

The fixed credentials above are local-only. To create missing accounts in Atlas, run `npm run setup:production` from PowerShell with `PRODUCTION_MONGO_URI` and the eight account passwords set in the current process environment. Use a unique password of at least 12 characters per account. The script hashes passwords, creates missing accounts only, and does not change existing accounts or complaints. Do not put production passwords in source files, commit them, or use `npm run setup:local` with Atlas.

The account emails are `admin@civicsense.in`, `pwd@civicsense.in`, `sanitation@civicsense.in`, `drainage@civicsense.in`, `water@civicsense.in`, `electrical@civicsense.in`, `planning@civicsense.in`, and `general@civicsense.in`. Existing accounts are left unchanged; reset those separately through an authorized account-recovery process.

## Deploy the frontend to Vercel

Import this GitHub repository into Vercel and configure the project:

- Root Directory: repository root
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE=https://<your-render-api>.onrender.com`

Replace the example API URL with your Render service URL, without a trailing slash or `/api`. The root `vercel.json` rewrites frontend routes to `index.html` so direct links and browser refreshes work.

After deploying, set the Render API's `CLIENT_ORIGIN` environment variable to the exact Vercel site origin (for example, `https://<your-project>.vercel.app`) and redeploy the API. Redeploy the Vercel site whenever you change `VITE_API_BASE`.

If registration or sign-in shows **Failed to fetch**, open the Vercel project's
environment variables and set `VITE_API_BASE` to the Render **Express API**
service's public root URL (for example, `https://<your-api>.onrender.com`), not
the Python AI service URL and not a URL ending in `/api`. Then redeploy the
frontend. In Render, set the Express API's `CLIENT_ORIGIN` to the exact browser
origin serving the frontend, such as `https://<your-project>.vercel.app` (no path
or trailing slash), then redeploy the API. Check the API root URL returns
`{"service":"CivicSense API","ok":true,...}` and that `<your-api-url>/api/health`
reports `db: "connected"`. If the browser still blocks the request, check its
developer-console Network entry for the API request and any CORS error.

Frontend pages are loaded on demand so the initial download does not include maps, admin charts, and other screens that are not being viewed. The app also checks API health and loads the signed-in user's complaints concurrently. If the Render API is on a plan that sleeps while idle, its first request can still be delayed while the service starts; an always-on service is needed to avoid that cold-start delay.

### Enable production photo verification

The Python AI verifier is a separate service; deploying the Vercel frontend and Express API does not deploy it. In Render, create a Python web service from this repository with root directory `ai-service`, build command `pip install -r requirements.txt`, and start command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Wait for the Python service deployment to finish, then copy its public service URL.

In the **Express API** Render service (not Vercel and not the Python service), add `AI_SERVICE_URL` with that public URL, without `/health` or a trailing slash, and redeploy the API. The API runs separately from the Python service, so its production default is intentionally not `localhost:8000`. Verify the connection at `<your-api-url>/api/ai/health`: `ok` and `reachable` should be `true`. If not, inspect the returned `error` and check the API's `AI_SERVICE_URL` plus the Python service's Render logs.

Being reachable does not by itself mean photo classification is accurate. The default YOLOv8 COCO weights are general-purpose and are not trained to identify civic problems. The API health response reports `civicModelReady: false` when those weights are in use. For civic issue verification, train or obtain model weights for the supported civic labels, make them available to the Python service, set its `CIVIC_MODEL_PATH` to the model file, and redeploy it. Until a civic-trained model is configured, the app will state that the photo is unverified; it will not mark generic model output as verified.

If photo classification fails, redeploy the Express API and retry; the report form now shows the upstream HTTP status and a next step. For HTTP 500, inspect the Python service logs for the inference error. For HTTP 502–504, check whether the Python service is starting, sleeping, or failing deployment. For HTTP 413, try a smaller image. A healthy `/api/ai/health` with `civicModelReady: false` means the service is reachable but civic-trained weights are not configured.
