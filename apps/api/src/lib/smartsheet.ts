import {
  type SmartsheetAccessLevel,
  type SmartsheetId,
  type SmartsheetRowInput,
  type SmartsheetSheet,
  createSmartsheetClient,
} from "@awb/smartsheet-client";
import { apiEnv } from "../env.js";

const client = createSmartsheetClient({
  accessToken: apiEnv.SMARTSHEET_ACCESS_TOKEN,
  integrationSource: apiEnv.SMARTSHEET_INTEGRATION_SOURCE,
});

const columnCache = new Map<string, Map<string, SmartsheetId>>();

export const smartsheetIds = {
  catalog: apiEnv.SMARTSHEET_SHEETID_CATALOG,
  questionBank: apiEnv.SMARTSHEET_SHEETID_QUESTIONBANK,
  results: apiEnv.SMARTSHEET_SHEETID_RESULTS,
  forms: apiEnv.SMARTSHEET_SHEETID_FORMS,
  ivr: apiEnv.SMARTSHEET_SHEETID_IVR,
};

export async function getSheet(sheetId: SmartsheetId): Promise<SmartsheetSheet> {
  return client.getSheet(sheetId);
}

export async function addRowByColumnTitle(
  sheetId: SmartsheetId,
  values: Record<string, unknown>,
): Promise<{ rowId: string }> {
  const columns = await getColumnMap(sheetId);
  const cells: SmartsheetRowInput["cells"] = [];

  for (const [title, rawValue] of Object.entries(values)) {
    const columnId = columns.get(title);

    if (!columnId || rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    cells.push({
      columnId,
      value: normalizeCellValue(rawValue),
      strict: false,
    });
  }

  const rows = await client.addRows(sheetId, [
    {
      toBottom: true,
      cells,
    },
  ]);

  return {
    rowId: String(rows[0]?.id ?? ""),
  };
}

export async function attachFileToRow(
  sheetId: SmartsheetId,
  rowId: SmartsheetId,
  file: {
    fileName: string;
    data: Uint8Array | ArrayBuffer;
    contentType?: string;
  },
) {
  return client.attachFileToRow(sheetId, rowId, {
    kind: "file",
    fileName: file.fileName,
    data: file.data,
    contentType: file.contentType,
  });
}

export async function attachLinkToRow(
  sheetId: SmartsheetId,
  rowId: SmartsheetId,
  link: {
    url: string;
    name?: string;
  },
) {
  return client.attachFileToRow(sheetId, rowId, {
    kind: "link",
    url: link.url,
    name: link.name,
  });
}

export async function shareSheet(
  sheetId: SmartsheetId,
  email: string,
  accessLevel: SmartsheetAccessLevel,
) {
  return client.shareSheet(sheetId, email, accessLevel, {
    sendEmail: true,
    subject: "AWB Academy operational access",
  });
}

export async function createWebhookFromEnv() {
  if (!apiEnv.SMARTSHEET_WEBHOOK_CALLBACK_URL || !apiEnv.SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID) {
    throw new Error("SMARTSHEET_WEBHOOK_CALLBACK_URL and SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID are required.");
  }

  return client.createWebhook({
    name: apiEnv.SMARTSHEET_WEBHOOK_NAME,
    callbackUrl: apiEnv.SMARTSHEET_WEBHOOK_CALLBACK_URL,
    scope: apiEnv.SMARTSHEET_WEBHOOK_SCOPE,
    scopeObjectId: apiEnv.SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID,
    events: apiEnv.SMARTSHEET_WEBHOOK_EVENTS.split(",").map((value) => value.trim()).filter(Boolean),
  });
}

export function sheetRowToObject(sheet: SmartsheetSheet): Array<Record<string, string>> {
  const columns = new Map(
    (sheet.columns ?? []).map((column) => [String(column.id), column.title]),
  );

  return (sheet.rows ?? []).map((row) => {
    const record: Record<string, string> = {
      _rowId: String(row.id),
    };

    for (const cell of row.cells) {
      const title = columns.get(String(cell.columnId));

      if (!title) {
        continue;
      }

      const value = cell.displayValue ?? cell.value;
      record[title] = value === undefined || value === null ? "" : String(value);
    }

    return record;
  });
}

async function getColumnMap(sheetId: SmartsheetId): Promise<Map<string, SmartsheetId>> {
  const cacheKey = String(sheetId);
  const cached = columnCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const sheet = await client.getSheet(sheetId);
  const map = new Map<string, SmartsheetId>();

  for (const column of sheet.columns ?? []) {
    map.set(column.title, column.id);
  }

  columnCache.set(cacheKey, map);
  return map;
}

function normalizeCellValue(value: unknown): string | number | boolean {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}
