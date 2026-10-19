# TNP Careers frontend

React job portal using Redux Toolkit, RTK Query and React Router. Backend source: https://github.com/GomathisankarS/tnpcareerbackend

## Local development

Use Node.js 22.14 or newer. From frontend/, run npm ci and npm run dev. The development server proxies /api to http://localhost:4000; set API_PROXY_TARGET in the development process environment to use another backend. Copy .env.example to .env locally if needed. VITE_API_URL defaults to /api. Never put database credentials or JWT secrets into frontend environment variables.

## Vercel deployment

Import this repository, choose the Vite preset and set Root Directory to frontend. Use Node.js 22.x, install command npm ci, build command npm run build and output directory dist. Leave VITE_API_URL unset or set it to /api. frontend/vercel.json forwards /api requests to https://tnp-career-backend.onrender.com and serves index.html for client routes. Keep API calls on /api for the HttpOnly refresh cookie.

After deployment, update FRONTEND_ORIGIN in the Render backend environment to the exact HTTPS Vercel production origin without a trailing slash. Save and redeploy the backend. Authentication will be rejected until that origin matches. Preview domains require their own matching backend configuration; use the stable production URL for the demo.

## Verification

From frontend/, run npm test, npm run lint, npm run format:check and npm run build. Browser tests are retained under frontend/e2e. Their Playwright configuration requires the backend package at ../backend relative to frontend/, including its test fixtures and dependencies, plus an isolated MySQL instance configured using E2E_DB_* variables. They cannot run against the production application database and are not part of the unit-test command. For full local browser tests, place the backend directory from the backend repository alongside frontend/ in this checkout and install its dependencies; do not commit that backend copy here.

## Hosted verification still required

Check deep links, registration, login, refresh persistence, logout, role guards, admin job/catalog operations and candidate profile/applications through Vercel. Local unit/build checks do not verify Vercel routing or forwarded cookies. Render free local files are ephemeral; persistent private resume storage is still outstanding in the backend.

## Dependency audit

At publication, npm audit --omit=dev reported zero vulnerabilities. The full audit reported three development-tool findings (one moderate, two critical) in Vitest 3 and its mocker/tinypool dependencies. A tested test-runner upgrade remains outstanding; these tools are not included in the static production bundle.
