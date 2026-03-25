import { APP_STORAGE_KEYS, createAppBackupPayload, parseAppBackup, serializeAppBackup } from "./appStorage";
import { APP_SETTINGS } from "../config/appSettings";

const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const DROPBOX_CURRENT_ACCOUNT_URL = "https://api.dropboxapi.com/2/users/get_current_account";
const DROPBOX_UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload";
const DROPBOX_DOWNLOAD_URL = "https://content.dropboxapi.com/2/files/download";
const DROPBOX_CALLBACK_PATH = "auth/dropbox/callback";
const DROPBOX_REMOTE_FILE = "/loop-forge-backup.json";

export interface DropboxAuthState {
  publicClientKey: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  accountDisplayName: string;
  accountEmail: string;
}

export interface DropboxConnectionResult {
  isSuccess: boolean;
  message: string;
}

interface DropboxAuthorizationResponse {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

interface DropboxTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface DropboxCurrentAccountResponse {
  email?: string;
  name?: {
    display_name?: string;
  };
}

interface DropboxBrowserBridge {
  loopForge?: {
    dropbox?: {
      connect?: (clientId: string, callbackPath: string) => Promise<DropboxAuthorizationResponse>;
    };
  };
}

export function getDropboxAppKey(): string {
  return APP_SETTINGS.dropbox.appKey.trim();
}

export function loadDropboxAuthState(): DropboxAuthState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const json = window.localStorage.getItem(APP_STORAGE_KEYS.dropboxAuth);

  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as Partial<DropboxAuthState>;

    if (
      typeof parsed.publicClientKey !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.accessTokenExpiresAt !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      return null;
    }

    return {
      publicClientKey: parsed.publicClientKey,
      accessToken: parsed.accessToken,
      accessTokenExpiresAt: parsed.accessTokenExpiresAt,
      refreshToken: parsed.refreshToken,
      accountDisplayName: typeof parsed.accountDisplayName === "string" ? parsed.accountDisplayName : "Dropbox account",
      accountEmail: typeof parsed.accountEmail === "string" ? parsed.accountEmail : "",
    };
  } catch {
    return null;
  }
}

export function clearDropboxAuthState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(APP_STORAGE_KEYS.dropboxAuth);
}

export async function connectToDropbox(): Promise<DropboxConnectionResult> {
  const appKey = getDropboxAppKey();

  if (!appKey) {
    return {
      isSuccess: false,
      message: "Dropbox app key is missing from app settings.",
    };
  }

  try {
    const authorization = await openDropboxAuthorizationPopup(appKey);
    const token = await exchangeAuthorizationCode(appKey, authorization);
    const account = await getCurrentAccount(token.access_token);
    const authState: DropboxAuthState = {
      publicClientKey: appKey,
      accessToken: token.access_token,
      accessTokenExpiresAt: new Date(Date.now() + Math.max(token.expires_in - 60, 60) * 1000).toISOString(),
      refreshToken: token.refresh_token ?? "",
      accountDisplayName: account.name?.display_name?.trim() || "Dropbox account",
      accountEmail: account.email?.trim() || "",
    };

    if (!authState.refreshToken) {
      return {
        isSuccess: false,
        message: "Dropbox did not return a refresh token. Confirm offline access for the app.",
      };
    }

    persistDropboxAuthState(authState);

    return {
      isSuccess: true,
      message: `Connected to Dropbox as ${authState.accountDisplayName}.`,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Dropbox connection failed.",
    };
  }
}

export async function uploadBackupToDropbox(): Promise<DropboxConnectionResult> {
  try {
    const accessToken = await ensureDropboxAccessToken();
    const payload = createAppBackupPayload();
    const content = serializeAppBackup(payload);

    const response = await fetch(DROPBOX_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          autorename: false,
          mode: "overwrite",
          mute: true,
          path: DROPBOX_REMOTE_FILE,
          strict_conflict: false,
        }),
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(await getDropboxErrorMessage(response, "Dropbox upload failed."));
    }

    return {
      isSuccess: true,
      message: "Uploaded Loop Forge backup to Dropbox.",
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Dropbox upload failed.",
    };
  }
}

export async function downloadBackupFromDropbox(): Promise<{ isSuccess: boolean; message: string; backupJson?: string }> {
  try {
    const accessToken = await ensureDropboxAccessToken();
    const response = await fetch(DROPBOX_DOWNLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: DROPBOX_REMOTE_FILE,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(await getDropboxErrorMessage(response, "Dropbox download failed."));
    }

    const backupJson = await response.text();
    parseAppBackup(backupJson);

    return {
      isSuccess: true,
      message: "Downloaded Loop Forge backup from Dropbox.",
      backupJson,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Dropbox download failed.",
    };
  }
}

function persistDropboxAuthState(state: DropboxAuthState): void {
  window.localStorage.setItem(APP_STORAGE_KEYS.dropboxAuth, JSON.stringify(state));
}

async function ensureDropboxAccessToken(): Promise<string> {
  const authState = loadDropboxAuthState();

  if (!authState || !authState.publicClientKey || !authState.refreshToken) {
    throw new Error("Connect to Dropbox before using cloud sync.");
  }

  if (new Date(authState.accessTokenExpiresAt).getTime() > Date.now()) {
    return authState.accessToken;
  }

  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: authState.refreshToken,
      client_id: authState.publicClientKey,
    }),
  });

  if (!response.ok) {
    throw new Error(await getDropboxErrorMessage(response, "Dropbox token refresh failed."));
  }

  const token = (await response.json()) as DropboxTokenResponse;
  authState.accessToken = token.access_token;
  authState.accessTokenExpiresAt = new Date(Date.now() + Math.max(token.expires_in - 60, 60) * 1000).toISOString();

  if (typeof token.refresh_token === "string" && token.refresh_token.trim().length > 0) {
    authState.refreshToken = token.refresh_token;
  }

  persistDropboxAuthState(authState);
  return authState.accessToken;
}

async function getCurrentAccount(accessToken: string): Promise<DropboxCurrentAccountResponse> {
  const response = await fetch(DROPBOX_CURRENT_ACCOUNT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getDropboxErrorMessage(response, "Failed to load the Dropbox account profile."));
  }

  return (await response.json()) as DropboxCurrentAccountResponse;
}

async function exchangeAuthorizationCode(
  appKey: string,
  authorization: DropboxAuthorizationResponse,
): Promise<DropboxTokenResponse> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorization.code,
      code_verifier: authorization.codeVerifier,
      redirect_uri: authorization.redirectUri,
      client_id: appKey,
    }),
  });

  if (!response.ok) {
    throw new Error(await getDropboxErrorMessage(response, "Dropbox token exchange failed."));
  }

  return (await response.json()) as DropboxTokenResponse;
}

async function openDropboxAuthorizationPopup(appKey: string): Promise<DropboxAuthorizationResponse> {
  const bridge = window as Window & typeof globalThis & DropboxBrowserBridge;
  const connect = bridge.loopForge?.dropbox?.connect;

  if (typeof connect !== "function") {
    throw new Error("Dropbox browser helper is unavailable.");
  }

  return await connect(appKey, DROPBOX_CALLBACK_PATH);
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getDropboxErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  const body = await response.text();

  if (!body.trim()) {
    return fallbackMessage;
  }

  return `${fallbackMessage} ${body}`;
}
