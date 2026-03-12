import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(rootDir, requestPath));

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

const browser = await chromium.launch({ headless: true });

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#persona-filter");

  assert.equal(await page.$eval("#persona-filter", (element) => element.value), "admin");
  assert.match(
    await page.$eval("#scope-summary", (element) => element.textContent || ""),
    /62 scoped routes/i
  );

  await page.goto(`http://127.0.0.1:${port}/#/signin`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const persona = document.querySelector("#persona-filter");
    const readout = document.querySelector("#route-readout strong");
    const summary = document.querySelector("#scope-summary");
    return (
      persona?.value === "admin" &&
      readout?.textContent !== "/signin" &&
      summary?.textContent?.includes("62 scoped routes")
    );
  });

  await page.selectOption("#persona-filter", "all");
  await page.waitForFunction(() => {
    const persona = document.querySelector("#persona-filter");
    const summary = document.querySelector("#scope-summary");
    return (
      persona?.value === "all" &&
      summary?.textContent?.includes("69 scoped routes")
    );
  });

  await page.goto(`http://127.0.0.1:${port}/#/signin`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const readout = document.querySelector("#route-readout strong");
    const persona = document.querySelector("#persona-filter");
    return readout?.textContent === "/signin" && persona?.value === "all";
  });

  await page.selectOption("#persona-filter", "admin");
  await page.waitForFunction(() => {
    const readout = document.querySelector("#route-readout strong");
    const summary = document.querySelector("#scope-summary");
    const persona = document.querySelector("#persona-filter");
    return (
      persona?.value === "admin" &&
      readout?.textContent !== "/signin" &&
      summary?.textContent?.includes("62 scoped routes")
    );
  });

  await page.locator("[data-check-key='ui']").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-check-key='ui']");
  assert.equal(
    await page.locator("[data-check-key='ui']").evaluate((element) => element.classList.contains("is-done")),
    true
  );

  await page.selectOption("#persona-filter", "all");
  await page.waitForFunction(() => {
    const persona = document.querySelector("#persona-filter");
    const summary = document.querySelector("#scope-summary");
    return persona?.value === "all" && summary?.textContent?.includes("69 scoped routes");
  });

  await page.fill("#screen-search", "chatbot");
  await page.waitForFunction(() => {
    const search = document.querySelector("#screen-search");
    return search?.value === "chatbot";
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#export-progress")
  ]);
  const downloadPath = path.join(os.tmpdir(), `platform-rollout-progress-${Date.now()}.json`);
  await download.saveAs(downloadPath);
  const snapshot = JSON.parse(await readFile(downloadPath, "utf8"));

  assert.equal(snapshot.persona, "all");
  assert.equal(snapshot.scopeType, "all-screens");
  assert.equal(typeof snapshot.visibleScreenCount, "number");
  assert.equal(typeof snapshot.totalScopedScreens, "number");

  await page.click("#clear-filters");
  await page.waitForFunction(() => {
    const persona = document.querySelector("#persona-filter");
    const search = document.querySelector("#screen-search");
    return persona?.value === "admin" && search?.value === "";
  });

  assert.equal(await page.$eval("#persona-filter", (element) => element.value), "admin");
  assert.equal(await page.$eval("#screen-search", (element) => element.value), "");

  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
