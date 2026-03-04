import test from "node:test";
import assert from "node:assert/strict";
import {
  SmartsheetApiError,
  createSmartsheetClient,
  type SmartsheetCreateWebhookInput,
} from "./index.js";

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

test("getSheet requests the expected sheet endpoint", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({ id: 42, name: "Catalog" });
    },
  });

  const sheet = await client.getSheet(42, {
    include: ["attachments", "rowPermalink"],
  });

  assert.equal(sheet.id, 42);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]?.url,
    "https://api.smartsheet.com/2.0/sheets/42?include=attachments%2CrowPermalink",
  );
  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>).Authorization,
    "Bearer token-123",
  );
});

test("addRows posts JSON rows and returns the created rows", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({
        message: "SUCCESS",
        resultCode: 0,
        result: [{ id: 99, cells: [{ columnId: 1, value: "Published" }] }],
      });
    },
  });

  const rows = await client.addRows(55, [
    {
      toBottom: true,
      cells: [{ columnId: 1, value: "Published" }],
    },
  ]);

  assert.equal(calls[0]?.url, "https://api.smartsheet.com/2.0/sheets/55/rows");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), [
    {
      toBottom: true,
      cells: [{ columnId: 1, value: "Published" }],
    },
  ]);
  assert.equal(rows[0]?.id, 99);
});

test("addRows rejects bulk requests above the Smartsheet limit", async () => {
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async () => createJsonResponse({}),
  });

  await assert.rejects(
    client.addRows(
      55,
      Array.from({ length: 501 }, () => ({
        cells: [{ columnId: 1, value: "x" }],
      })),
    ),
    /maximum of 500 rows/,
  );
});

test("attachFileToRow uploads binary content with Smartsheet headers", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({
        message: "SUCCESS",
        resultCode: 0,
        result: { id: 77, name: "voicemail.wav", attachmentType: "FILE" },
      });
    },
  });

  const attachment = await client.attachFileToRow(12, 34, {
    kind: "file",
    fileName: "voicemail.wav",
    contentType: "audio/wav",
    data: new Uint8Array([1, 2, 3, 4]),
  });

  assert.equal(
    calls[0]?.url,
    "https://api.smartsheet.com/2.0/sheets/12/rows/34/attachments",
  );
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>)["Content-Disposition"],
    'attachment; filename="voicemail.wav"',
  );
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>)["Content-Length"],
    "4",
  );
  assert.equal(attachment.id, 77);
});

test("attachFileToRow supports Smartsheet link attachments", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({
        message: "SUCCESS",
        resultCode: 0,
        result: { id: 88, attachmentType: "LINK", url: "https://example.com/file" },
      });
    },
  });

  const attachment = await client.attachFileToRow(12, 34, {
    kind: "link",
    url: "https://example.com/file",
    name: "Reference",
  });

  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>)["Content-Type"],
    "application/json",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    url: "https://example.com/file",
    attachmentType: "LINK",
    name: "Reference",
  });
  assert.equal(attachment.attachmentType, "LINK");
});

test("shareSheet posts recipient email and access level", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({
        message: "SUCCESS",
        resultCode: 0,
        result: [{ id: "share-1", email: "staff@example.com", accessLevel: "EDITOR" }],
      });
    },
  });

  const share = await client.shareSheet(99, "staff@example.com", "EDITOR", {
    sendEmail: false,
    subject: "AWB operational access",
  });

  assert.equal(
    calls[0]?.url,
    "https://api.smartsheet.com/2.0/sheets/99/shares?sendEmail=false",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), [
    {
      email: "staff@example.com",
      accessLevel: "EDITOR",
      subject: "AWB operational access",
    },
  ]);
  assert.equal(share.id, "share-1");
});

test("createWebhook posts a disabled webhook by default", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const payload: SmartsheetCreateWebhookInput = {
    name: "Publish changes",
    callbackUrl: "https://awb.example.com/smartsheet/webhook",
    scope: "sheet",
    scopeObjectId: 1234,
    events: ["*.*"],
  };
  const client = createSmartsheetClient({
    accessToken: "token-123",
    integrationSource: "APPLICATION,AWB,Academy",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return createJsonResponse({
        message: "SUCCESS",
        resultCode: 0,
        result: {
          id: 555,
          ...payload,
          enabled: false,
          version: 1,
          status: "NEW_NOT_VERIFIED",
        },
      });
    },
  });

  const webhook = await client.createWebhook(payload);

  assert.equal(calls[0]?.url, "https://api.smartsheet.com/2.0/webhooks");
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>)["smartsheet-integration-source"],
    "APPLICATION,AWB,Academy",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    ...payload,
    enabled: false,
    version: 1,
  });
  assert.equal(webhook.status, "NEW_NOT_VERIFIED");
});

test("SmartsheetApiError exposes status and payload on non-2xx responses", async () => {
  const client = createSmartsheetClient({
    accessToken: "token-123",
    fetch: async () =>
      createJsonResponse(
        {
          errorCode: 1006,
          message: "Not Found",
        },
        { status: 404 },
      ),
  });

  await assert.rejects(
    client.getSheet(999),
    (error: unknown) => {
      assert.ok(error instanceof SmartsheetApiError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.details, {
        errorCode: 1006,
        message: "Not Found",
      });
      return true;
    },
  );
});
