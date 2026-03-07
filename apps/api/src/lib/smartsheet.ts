import {
  type SmartsheetAccessLevel,
  type SmartsheetId,
  type SmartsheetRowInput,
  type SmartsheetSheet,
  SmartsheetClient,
  createSmartsheetClient,
} from "@awb/smartsheet-client";
import { apiEnv } from "../env.js";

type SheetKey = "catalog" | "questionBank" | "results" | "forms" | "ivr";

export interface SmartsheetSheetCheck {
  ok: boolean;
  sheetId: string;
  error: string | null;
}

export interface SmartsheetHealthReport {
  required: boolean;
  configured: boolean;
  ok: boolean;
  missingKeys: string[];
  sheetChecks: Record<SheetKey, SmartsheetSheetCheck>;
}

const columnCache = new Map<string, Map<string, SmartsheetId>>();

let client: SmartsheetClient | null = null;

export const smartsheetIds = {
  catalog: apiEnv.SMARTSHEET_SHEETID_CATALOG,
  questionBank: apiEnv.SMARTSHEET_SHEETID_QUESTIONBANK,
  results: apiEnv.SMARTSHEET_SHEETID_RESULTS,
  forms: apiEnv.SMARTSHEET_SHEETID_FORMS,
  ivr: apiEnv.SMARTSHEET_SHEETID_IVR,
};

function isUnsetOrPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (normalized.includes("placeholder")) {
    return true;
  }
  return normalized === "replace-me";
}

export function getMissingSmartsheetConfigKeys(): string[] {
  const missing: string[] = [];

  if (isUnsetOrPlaceholder(apiEnv.SMARTSHEET_ACCESS_TOKEN)) {
    missing.push("SMARTSHEET_ACCESS_TOKEN");
  }
  if (isUnsetOrPlaceholder(smartsheetIds.catalog)) {
    missing.push("SMARTSHEET_SHEETID_CATALOG");
  }
  if (isUnsetOrPlaceholder(smartsheetIds.questionBank)) {
    missing.push("SMARTSHEET_SHEETID_QUESTIONBANK");
  }
  if (isUnsetOrPlaceholder(smartsheetIds.results)) {
    missing.push("SMARTSHEET_SHEETID_RESULTS");
  }
  if (isUnsetOrPlaceholder(smartsheetIds.forms)) {
    missing.push("SMARTSHEET_SHEETID_FORMS");
  }
  if (isUnsetOrPlaceholder(smartsheetIds.ivr)) {
    missing.push("SMARTSHEET_SHEETID_IVR");
  }

  return missing;
}

export function isSmartsheetRequired(): boolean {
  return apiEnv.SMARTSHEET_REQUIRED;
}

export function isSmartsheetConfigured(): boolean {
  return getMissingSmartsheetConfigKeys().length === 0;
}

export async function getSmartsheetHealthReport(): Promise<SmartsheetHealthReport> {
  const required = isSmartsheetRequired();
  const missingKeys = getMissingSmartsheetConfigKeys();
  const configured = missingKeys.length === 0;
  const sheetChecks = createEmptySheetChecks();

  if (!required) {
    return {
      required,
      configured,
      ok: true,
      missingKeys,
      sheetChecks,
    };
  }

  if (!configured) {
    return {
      required,
      configured: false,
      ok: false,
      missingKeys,
      sheetChecks,
    };
  }

  const checks = await Promise.all(
    (Object.entries(smartsheetIds) as Array<[SheetKey, string]>).map(
      async ([key, sheetId]): Promise<[SheetKey, SmartsheetSheetCheck]> => {
        try {
          await getSheet(sheetId);
          return [
            key,
            {
              ok: true,
              sheetId,
              error: null,
            },
          ];
        } catch (error) {
          return [
            key,
            {
              ok: false,
              sheetId,
              error: normalizeErrorMessage(error),
            },
          ];
        }
      },
    ),
  );

  for (const [key, check] of checks) {
    sheetChecks[key] = check;
  }

  return {
    required,
    configured: true,
    ok: Object.values(sheetChecks).every((check) => check.ok),
    missingKeys,
    sheetChecks,
  };
}

export async function getSheet(sheetId: SmartsheetId): Promise<SmartsheetSheet> {
  return getSmartsheetClient().getSheet(assertSheetId(sheetId));
}

export async function addRowByColumnTitle(
  sheetId: SmartsheetId,
  values: Record<string, unknown>,
): Promise<{ rowId: string }> {
  const safeSheetId = assertSheetId(sheetId);
  const columns = await getColumnMap(safeSheetId);
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

  const rows = await getSmartsheetClient().addRows(safeSheetId, [
    {
      toBottom: true,
      cells,
    },
  ]);

  return {
    rowId: String(rows[0]?.id ?? ""),
  };
}

export async function updateRowByColumnTitle(
  sheetId: SmartsheetId,
  rowId: SmartsheetId,
  values: Record<string, unknown>,
): Promise<void> {
  const safeSheetId = assertSheetId(sheetId);
  const safeRowId = assertSheetId(rowId);
  const columns = await getColumnMap(safeSheetId);
  const cells: SmartsheetRowInput["cells"] = [];

  for (const [title, rawValue] of Object.entries(values)) {
    const columnId = columns.get(title);

    if (!columnId || rawValue === undefined || rawValue === null) {
      continue;
    }

    cells.push({
      columnId,
      value: normalizeCellValue(rawValue),
      strict: false,
    });
  }

  if (cells.length === 0) {
    return;
  }

  await getSmartsheetClient().updateRows(safeSheetId, [
    {
      id: safeRowId,
      cells,
    },
  ]);
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
  return getSmartsheetClient().attachFileToRow(assertSheetId(sheetId), assertSheetId(rowId), {
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
  return getSmartsheetClient().attachFileToRow(assertSheetId(sheetId), assertSheetId(rowId), {
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
  return getSmartsheetClient().shareSheet(assertSheetId(sheetId), email, accessLevel, {
    sendEmail: true,
    subject: "AWB Academy operational access",
  });
}

export async function createWebhookFromEnv() {
  if (!apiEnv.SMARTSHEET_WEBHOOK_CALLBACK_URL || !apiEnv.SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID) {
    throw new Error("SMARTSHEET_WEBHOOK_CALLBACK_URL and SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID are required.");
  }

  if (!apiEnv.SMARTSHEET_ACCESS_TOKEN.trim()) {
    throw new Error("SMARTSHEET_ACCESS_TOKEN is required.");
  }

  return getSmartsheetClient().createWebhook({
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

function getSmartsheetClient(): SmartsheetClient {
  const token = apiEnv.SMARTSHEET_ACCESS_TOKEN.trim();

  if (!token) {
    throw new Error("Smartsheet is not configured: SMARTSHEET_ACCESS_TOKEN is missing.");
  }

  if (!client) {
    client = createSmartsheetClient({
      accessToken: token,
      integrationSource: apiEnv.SMARTSHEET_INTEGRATION_SOURCE,
    });
  }

  return client;
}

async function getColumnMap(sheetId: SmartsheetId): Promise<Map<string, SmartsheetId>> {
  const safeSheetId = assertSheetId(sheetId);
  const cacheKey = String(safeSheetId);
  const cached = columnCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const sheet = await getSmartsheetClient().getSheet(safeSheetId);
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

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Smartsheet error";
}

function assertSheetId(sheetId: SmartsheetId): string {
  const normalized = String(sheetId ?? "").trim();

  if (!normalized) {
    throw new Error("Smartsheet is not configured: sheet ID is missing.");
  }

  return normalized;
}

function createEmptySheetChecks(): Record<SheetKey, SmartsheetSheetCheck> {
  return {
    catalog: {
      ok: false,
      sheetId: smartsheetIds.catalog,
      error: "Missing configuration",
    },
    questionBank: {
      ok: false,
      sheetId: smartsheetIds.questionBank,
      error: "Missing configuration",
    },
    results: {
      ok: false,
      sheetId: smartsheetIds.results,
      error: "Missing configuration",
    },
    forms: {
      ok: false,
      sheetId: smartsheetIds.forms,
      error: "Missing configuration",
    },
    ivr: {
      ok: false,
      sheetId: smartsheetIds.ivr,
      error: "Missing configuration",
    },
  };
}
