import { defineConfig } from "@playwright/test";

const webPort = 3101;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    headless: true,
  },
  webServer: {
    command:
      "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101/mock-api NEXT_PUBLIC_APP_ENV=test npm run build --workspace @awb/web && NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101/mock-api NEXT_PUBLIC_APP_ENV=test npm run start --workspace @awb/web -- --hostname 127.0.0.1 --port 3101",
    port: webPort,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
