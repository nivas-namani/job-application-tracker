import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://trackify:trackify@localhost:5432/trackify?schema=public',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-only-secret-that-is-long-enough-to-be-valid',
      CLIENT_ORIGIN: 'http://localhost:5173',
      COOKIE_SECURE: 'false'
    }
  }
});
