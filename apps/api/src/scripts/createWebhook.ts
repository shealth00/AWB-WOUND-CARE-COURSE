import { createWebhookFromEnv } from "../lib/smartsheet.js";

async function main() {
  const webhook = await createWebhookFromEnv();
  console.log(JSON.stringify(webhook, null, 2));
}

void main();
