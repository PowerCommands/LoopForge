export const APP_STORAGE_KEYS = {
  arrangements: "loop-forge-arrangement-library",
  volume: "loop-forge-volume",
  theme: "loop-forge-theme",
  dropboxAuth: "loop-forge-sync-dropbox-auth",
  syncMetadata: "loop-forge-sync-metadata",
} as const;

export interface ManagedStorageFileDescriptor {
  key: string;
  name: string;
  description: string;
  primary?: boolean;
}

export interface ManagedStorageFileSnapshot extends ManagedStorageFileDescriptor {
  exists: boolean;
  bytes: number;
  recordCount: number;
  rawValue: string | null;
}

export interface AppBackupPayload {
  version: string;
  exportedAt: string;
  files: Array<{
    key: string;
    value: string;
  }>;
}

const MANAGED_STORAGE_FILES: ManagedStorageFileDescriptor[] = [
  {
    key: APP_STORAGE_KEYS.arrangements,
    name: "Arrangement Library",
    description: "Saved arrangements including loops, URLs and lyrics.",
    primary: true,
  },
  {
    key: APP_STORAGE_KEYS.volume,
    name: "Volume",
    description: "The current master volume preference.",
  },
  {
    key: APP_STORAGE_KEYS.theme,
    name: "Theme",
    description: "The selected application theme.",
  },
];

export function getManagedStorageFileDescriptors(): ManagedStorageFileDescriptor[] {
  return MANAGED_STORAGE_FILES;
}

export function getManagedStorageSnapshots(storage: Storage = window.localStorage): ManagedStorageFileSnapshot[] {
  return MANAGED_STORAGE_FILES.map((descriptor) => {
    const rawValue = storage.getItem(descriptor.key);
    const exists = rawValue !== null;
    return {
      ...descriptor,
      exists,
      rawValue,
      bytes: exists ? getUtf8ByteLength(descriptor.key) + getUtf8ByteLength(rawValue) : 0,
      recordCount: getRecordCount(descriptor.key, rawValue),
    };
  });
}

export function getBrowserStorageUsageBytes(storage: Storage = window.localStorage): number {
  let total = 0;

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index) ?? "";
    const value = storage.getItem(key) ?? "";
    total += getUtf8ByteLength(key);
    total += getUtf8ByteLength(value);
  }

  return total;
}

export function createAppBackupPayload(storage: Storage = window.localStorage): AppBackupPayload {
  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    files: getManagedStorageFileDescriptors()
      .map((file) => ({
        key: file.key,
        value: storage.getItem(file.key),
      }))
      .filter((file): file is { key: string; value: string } => typeof file.value === "string"),
  };
}

export function serializeAppBackup(payload: AppBackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function parseAppBackup(json: string): AppBackupPayload {
  const parsed = JSON.parse(json) as Partial<AppBackupPayload>;

  if (!Array.isArray(parsed.files)) {
    throw new Error("Backup file is missing the files collection.");
  }

  return {
    version: typeof parsed.version === "string" ? parsed.version : "1.0.0",
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    files: parsed.files.flatMap((file) => {
      if (!file || typeof file.key !== "string" || typeof file.value !== "string") {
        return [];
      }

      return [file];
    }),
  };
}

export function restoreAppBackup(payload: AppBackupPayload, storage: Storage = window.localStorage): void {
  const allowedKeys = new Set(MANAGED_STORAGE_FILES.map((file) => file.key));

  MANAGED_STORAGE_FILES.forEach((file) => {
    storage.removeItem(file.key);
  });

  payload.files.forEach((file) => {
    if (allowedKeys.has(file.key)) {
      storage.setItem(file.key, file.value);
    }
  });
}

export function deleteManagedStorageFile(key: string, storage: Storage = window.localStorage): void {
  storage.removeItem(key);
}

export function deleteAllManagedStorageFiles(storage: Storage = window.localStorage): void {
  MANAGED_STORAGE_FILES.forEach((file) => {
    storage.removeItem(file.key);
  });
}

function getRecordCount(key: string, rawValue: string | null): number {
  if (!rawValue) {
    return 0;
  }

  if (key === APP_STORAGE_KEYS.arrangements) {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  return 1;
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
