// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const USE_LOCAL_SERVER = /^https?:\/\/127\.0\.0\.1:4173\/?$/.test(BASE_URL) && process.env.PW_AUTO_SERVER !== '0';

module.exports = defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  timeout: 45000,
  retries: 0,
  reporter: 'line',
  webServer: USE_LOCAL_SERVER
    ? {
        command: 'python3 -m http.server 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 15000
      }
    : undefined,
  use: {
    baseURL: BASE_URL,
    screenshot: 'on',
    trace: 'on',
    video: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium'
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox'
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit'
      }
    }
  ]
});
