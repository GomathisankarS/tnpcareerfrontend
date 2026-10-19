import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';
process.env.E2E_ADMIN_PASSWORD ||= randomBytes(24).toString('base64url');
process.env.E2E_CANDIDATE_PASSWORD ||= randomBytes(24).toString('base64url');
process.env.E2E_DB_NAME ||= `tnp_browser_${randomBytes(6).toString('hex')}_test`;
process.env.E2E_JWT_SECRET ||= randomBytes(48).toString('base64url');
const backendEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DB_HOST: process.env.E2E_DB_HOST || '127.0.0.1',
  DB_PORT: process.env.E2E_DB_PORT || '13307',
  DB_USER: process.env.E2E_DB_USER || 'root',
  DB_PASSWORD: process.env.E2E_DB_PASSWORD || '',
  DB_NAME: process.env.E2E_DB_NAME,
  JWT_SECRET: process.env.E2E_JWT_SECRET,
  PORT: '14000',
  FRONTEND_ORIGIN: process.env.E2E_FRONTEND_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: '../scratch/browser-resumes'
};
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_FRONTEND_ORIGIN || 'http://localhost:5173',
    trace: 'off',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'node ../backend/tests/fixtures/browser-server.js',
      url: 'http://localhost:14000/api/health',
      env: backendEnv,
      reuseExistingServer: false,
      timeout: 60000
    },
    {
      command: process.env.E2E_FRONTEND_COMMAND || 'npm run dev',
      url: process.env.E2E_FRONTEND_ORIGIN || 'http://localhost:5173',
      env: { ...process.env, API_PROXY_TARGET: 'http://localhost:14000' },
      reuseExistingServer: false,
      timeout: 60000
    }
  ],
  globalTeardown: './e2e/teardown.js'
});
