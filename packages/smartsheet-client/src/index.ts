export type SmartsheetId = string | number;

export type SmartsheetAccessLevel =
  | "VIEWER"
  | "COMMENTER"
  | "EDITOR"
  | "EDITOR_SHARE"
  | "ADMIN";

export type SmartsheetWebhookScope = "sheet" | "workspace" | "plan";

export type SmartsheetAttachmentType =
  | "LINK"
  | "BOX_COM"
  | "DROPBOX"
  | "EGNYTE"
  | "EVERNOTE"
  | "GOOGLE_DRIVE"
  | "ONEDRIVE";

export type SmartsheetCellValue = string | number | boolean | null;

export interface SmartsheetCellInput {
  columnId: SmartsheetId;
  value?: SmartsheetCellValue;
  strict?: boolean;
  overrideValidation?: boolean;
}

export interface SmartsheetRowInput {
  cells: SmartsheetCellInput[];
  toTop?: boolean;
  toBottom?: boolean;
  parentId?: SmartsheetId;
  siblingId?: SmartsheetId;
  above?: boolean;
  locked?: boolean;
}

export interface SmartsheetRowUpdateInput {
  id: SmartsheetId;
  cells: SmartsheetCellInput[];
  locked?: boolean;
}

export interface SmartsheetSheetColumn {
  id: SmartsheetId;
  title: string;
  type: string;
}

export interface SmartsheetSheetRow {
  id: SmartsheetId;
  rowNumber?: number;
  cells: Array<{
    columnId: SmartsheetId;
    value?: SmartsheetCellValue;
    displayValue?: string;
  }>;
}

export interface SmartsheetSheet {
  id: SmartsheetId;
  name?: string;
  version?: number;
  columns?: SmartsheetSheetColumn[];
  rows?: SmartsheetSheetRow[];
}

export interface SmartsheetAttachment {
  id: SmartsheetId;
  name?: string;
  attachmentType?: string;
  url?: string;
  mimeType?: string;
  sizeInKb?: number;
}

export interface SmartsheetShare {
  id: string;
  email?: string;
  accessLevel?: SmartsheetAccessLevel;
  scope?: string;
}

export interface SmartsheetWebhook {
  id: SmartsheetId;
  name: string;
  callbackUrl: string;
  scope: SmartsheetWebhookScope;
  scopeObjectId: SmartsheetId;
  events: string[];
  enabled: boolean;
  status?: string;
  version: 1;
  sharedSecret?: string;
}

export interface SmartsheetGetSheetOptions {
  include?: string[];
}

export interface SmartsheetShareSheetOptions {
  sendEmail?: boolean;
  message?: string;
  subject?: string;
  ccMe?: boolean;
}

export interface SmartsheetCreateWebhookInput {
  name: string;
  callbackUrl: string;
  scope: SmartsheetWebhookScope;
  scopeObjectId: SmartsheetId;
  events: string[];
  version?: 1;
  enabled?: boolean;
  customHeaders?: Record<string, string>;
  subscope?: {
    columnIds?: SmartsheetId[];
  };
}

export interface SmartsheetFileAttachmentInput {
  kind: "file";
  fileName: string;
  data: ArrayBuffer | Uint8Array | Blob;
  contentType?: string;
}

export interface SmartsheetLinkAttachmentInput {
  kind: "link";
  url: string;
  attachmentType?: SmartsheetAttachmentType;
  name?: string;
}

export type SmartsheetRowAttachmentInput =
  | SmartsheetFileAttachmentInput
  | SmartsheetLinkAttachmentInput;

type FetchLike = typeof fetch;

interface SmartsheetClientOptions {
  accessToken: string;
  baseUrl?: string;
  fetch?: FetchLike;
  integrationSource?: string;
}

interface SmartsheetSuccessEnvelope<T> {
  message: "SUCCESS" | "PARTIAL_SUCCESS";
  resultCode: number;
  result: T;
  version?: number | null;
}

export class SmartsheetApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "SmartsheetApiError";
    this.status = status;
    this.details = details;
  }
}

export class SmartsheetClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly integrationSource?: string;

  constructor(options: SmartsheetClientOptions) {
    if (!options.accessToken) {
      throw new Error("Smartsheet access token is required");
    }

    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl ?? "https://api.smartsheet.com/2.0").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.integrationSource = options.integrationSource;
  }

  async getSheet(
    sheetId: SmartsheetId,
    options: SmartsheetGetSheetOptions = {},
  ): Promise<SmartsheetSheet> {
    const searchParams = new URLSearchParams();

    if (options.include?.length) {
      searchParams.set("include", options.include.join(","));
    }

    return this.request<SmartsheetSheet>(
      "GET",
      `/sheets/${sheetId}${withQuery(searchParams)}`,
    );
  }

  async addRows(
    sheetId: SmartsheetId,
    rows: SmartsheetRowInput[],
  ): Promise<SmartsheetSheetRow[]> {
    if (rows.length === 0) {
      throw new Error("addRows requires at least one row");
    }

    if (rows.length > 500) {
      throw new Error("Smartsheet addRows supports a maximum of 500 rows per request");
    }

    const response = await this.request<SmartsheetSuccessEnvelope<SmartsheetSheetRow[]>>(
      "POST",
      `/sheets/${sheetId}/rows`,
      {
        body: JSON.stringify(rows),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.result;
  }

  async updateRows(
    sheetId: SmartsheetId,
    rows: SmartsheetRowUpdateInput[],
  ): Promise<SmartsheetSheetRow[]> {
    if (rows.length === 0) {
      throw new Error("updateRows requires at least one row");
    }

    if (rows.length > 500) {
      throw new Error("Smartsheet updateRows supports a maximum of 500 rows per request");
    }

    const response = await this.request<SmartsheetSuccessEnvelope<SmartsheetSheetRow[]>>(
      "PUT",
      `/sheets/${sheetId}/rows`,
      {
        body: JSON.stringify(rows),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.result;
  }

  async attachFileToRow(
    sheetId: SmartsheetId,
    rowId: SmartsheetId,
    attachment: SmartsheetRowAttachmentInput,
  ): Promise<SmartsheetAttachment> {
    if (attachment.kind === "link") {
      const response = await this.request<SmartsheetSuccessEnvelope<SmartsheetAttachment>>(
      "POST",
      `/sheets/${sheetId}/rows/${rowId}/attachments`,
      {
          body: JSON.stringify(
            omitUndefined({
              url: attachment.url,
              attachmentType: attachment.attachmentType ?? "LINK",
              name: attachment.name,
            }),
          ),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return response.result;
    }

    const body = toBodyInit(attachment.data);
    const contentLength = getContentLength(attachment.data);
    const headers: Record<string, string> = {
      "Content-Type": attachment.contentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
    };

    if (contentLength !== undefined) {
      headers["Content-Length"] = String(contentLength);
    }

    const response = await this.request<SmartsheetSuccessEnvelope<SmartsheetAttachment>>(
      "POST",
      `/sheets/${sheetId}/rows/${rowId}/attachments`,
      {
        body,
        headers,
      },
    );

    return response.result;
  }

  async shareSheet(
    sheetId: SmartsheetId,
    email: string,
    accessLevel: SmartsheetAccessLevel,
    options: SmartsheetShareSheetOptions = {},
  ): Promise<SmartsheetShare> {
    const searchParams = new URLSearchParams({
      sendEmail: String(options.sendEmail ?? true),
    });

    const response = await this.request<
      SmartsheetSuccessEnvelope<SmartsheetShare | SmartsheetShare[]>
    >(
      "POST",
      `/sheets/${sheetId}/shares${withQuery(searchParams)}`,
      {
        body: JSON.stringify([
          omitUndefined({
            email,
            accessLevel,
            message: options.message,
            subject: options.subject,
            ccMe: options.ccMe,
          }),
        ]),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return Array.isArray(response.result) ? response.result[0]! : response.result;
  }

  async createWebhook(payload: SmartsheetCreateWebhookInput): Promise<SmartsheetWebhook> {
    const response = await this.request<SmartsheetSuccessEnvelope<SmartsheetWebhook>>(
      "POST",
      "/webhooks",
      {
        body: JSON.stringify({
          ...payload,
          enabled: payload.enabled ?? false,
          version: payload.version ?? 1,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.result;
  }

  private async request<T>(
    method: string,
    path: string,
    init: {
      body?: BodyInit;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      body: init.body,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(this.integrationSource
          ? { "smartsheet-integration-source": this.integrationSource }
          : {}),
        ...init.headers,
      },
    });

    const payload = await readResponseBody(response);

    if (!response.ok) {
      throw new SmartsheetApiError(
        `Smartsheet request failed with status ${response.status}`,
        response.status,
        payload,
      );
    }

    return payload as T;
  }
}

export function createSmartsheetClient(options: SmartsheetClientOptions): SmartsheetClient {
  return new SmartsheetClient(options);
}

function withQuery(searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function omitUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function getContentLength(data: ArrayBuffer | Uint8Array | Blob): number | undefined {
  if (data instanceof Blob) {
    return data.size;
  }

  if (data instanceof Uint8Array) {
    return data.byteLength;
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }

  return undefined;
}

function toBodyInit(data: ArrayBuffer | Uint8Array | Blob): BodyInit {
  if (data instanceof Blob) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  return new Uint8Array(data);
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
