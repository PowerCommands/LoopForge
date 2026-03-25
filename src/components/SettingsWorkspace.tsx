import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import dropboxLogo from "../assets/images/dropbox.png";
import type { StoredArrangement } from "../music/arrangementLibrary";
import {
  APP_STORAGE_KEYS,
  createAppBackupPayload,
  deleteAllManagedStorageFiles,
  deleteManagedStorageFile,
  getBrowserStorageUsageBytes,
  getManagedStorageSnapshots,
  parseAppBackup,
  restoreAppBackup,
  serializeAppBackup,
  type ManagedStorageFileSnapshot,
} from "../lib/appStorage";
import {
  connectToDropbox,
  downloadBackupFromDropbox,
  loadDropboxAuthState,
  uploadBackupToDropbox,
} from "../lib/dropboxSync";
import { useConfirmDialog } from "./ui/confirm-dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type SettingsSubTab = "data";

interface SettingsWorkspaceProps {
  arrangements: StoredArrangement[];
  onStorageChanged: () => void;
}

interface SyncMetadata {
  providerName: string;
  accountName: string;
  isConnected: boolean;
  lastUploadAt: string;
  lastDownloadAt: string;
}

const TOTAL_STORAGE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SYNC_METADATA: SyncMetadata = {
  providerName: "Dropbox",
  accountName: "",
  isConnected: false,
  lastUploadAt: "",
  lastDownloadAt: "",
};

export function SettingsWorkspace({ arrangements, onStorageChanged }: SettingsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<SettingsSubTab>("data");
  const [storageFiles, setStorageFiles] = useState<ManagedStorageFileSnapshot[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata>(DEFAULT_SYNC_METADATA);
  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncBusy, setIsSyncBusy] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    root: true,
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const confirm = useConfirmDialog();

  useEffect(() => {
    refreshInsights();
  }, [arrangements]);

  const displayUsedBytes = Math.min(Math.max(usedBytes, 0), TOTAL_STORAGE_BYTES);
  const freeBytes = Math.max(0, TOTAL_STORAGE_BYTES - displayUsedBytes);
  const donutCircumference = 2 * Math.PI * 42;
  const donutOffset = donutCircumference * (1 - displayUsedBytes / TOTAL_STORAGE_BYTES);
  const primaryArrangementFile = storageFiles.find((file) => file.primary) ?? null;
  const arrangementDomainData = useMemo(() => arrangements, [arrangements]);

  const handleExportBackup = () => {
    const backup = serializeAppBackup(createAppBackupPayload());
    downloadTextFile(`loop-forge-backup-${formatTimestampForFilename(new Date().toISOString())}.json`, backup, "application/json");
    setSyncStatus("Backup exported successfully.");
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const shouldContinue = await confirm({
      title: "Restore Backup?",
      description: "This replaces the current local data with the selected backup file. This cannot be undone.",
      confirmLabel: "Restore Backup",
      tone: "destructive",
    });

    if (!shouldContinue) {
      event.target.value = "";
      return;
    }

    try {
      const json = await file.text();
      const backup = parseAppBackup(json);
      restoreAppBackup(backup);
      onStorageChanged();
      refreshInsights();
      setSyncStatus("Backup restored successfully.");
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Backup restore failed.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteFile = async (file: ManagedStorageFileSnapshot) => {
    const shouldContinue = await confirm({
      title: `Delete ${file.name}?`,
      description: "This removes the stored LocalStorage data for the selected item.",
      confirmLabel: "Delete",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    deleteManagedStorageFile(file.key);

    if (file.key === APP_STORAGE_KEYS.arrangements) {
      setExpandedPaths({ root: true });
    }

    onStorageChanged();
    refreshInsights();
    setSyncStatus(`${file.name} was removed from LocalStorage.`);
  };

  const handleDeleteAllFiles = async () => {
    const shouldContinue = await confirm({
      title: "Delete All Stored Files?",
      description: "This removes all managed Loop Forge data from LocalStorage on this browser.",
      confirmLabel: "Delete All",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    deleteAllManagedStorageFiles();
    onStorageChanged();
    refreshInsights();
    setExpandedPaths({ root: true });
    setSyncStatus("All managed LocalStorage files were removed.");
  };

  const handleConnectDropbox = async () => {
    setIsSyncBusy(true);
    const result = await connectToDropbox();

    if (result.isSuccess) {
      const authState = loadDropboxAuthState();
      updateSyncMetadata((current) => ({
        ...current,
        isConnected: authState !== null,
        accountName: authState?.accountDisplayName ?? current.accountName,
      }));
    }

    setSyncStatus(result.message);
    refreshInsights();
    setIsSyncBusy(false);
  };

  const handleUploadDropbox = async () => {
    setIsSyncBusy(true);
    const result = await uploadBackupToDropbox();

    if (result.isSuccess) {
      updateSyncMetadata((current) => ({
        ...current,
        isConnected: true,
        lastUploadAt: new Date().toISOString(),
      }));
    }

    setSyncStatus(result.message);
    refreshInsights();
    setIsSyncBusy(false);
  };

  const handleDownloadDropbox = async () => {
    const shouldContinue = await confirm({
      title: "Download From Dropbox?",
      description: "This replaces the current local data with the backup stored in Dropbox. This cannot be undone.",
      confirmLabel: "Download and Replace",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    setIsSyncBusy(true);
    const result = await downloadBackupFromDropbox();

    if (result.isSuccess && result.backupJson) {
      const backup = parseAppBackup(result.backupJson);
      restoreAppBackup(backup);
      updateSyncMetadata((current) => ({
        ...current,
        isConnected: true,
        lastDownloadAt: new Date().toISOString(),
      }));
      onStorageChanged();
    }

    refreshInsights();
    setSyncStatus(result.message);
    setIsSyncBusy(false);
  };

  const togglePath = (path: string) => {
    setExpandedPaths((current) => ({
      ...current,
      [path]: !current[path],
    }));
  };

  return (
    <div className="mx-auto flex w-[90%] flex-col gap-5">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage data storage, backups, Dropbox sync and inspect the arrangement library model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2 rounded-full border border-border bg-card/70 p-1 shadow-sm">
            <Button type="button" size="sm" variant={activeTab === "data" ? "default" : "secondary"} onClick={() => setActiveTab("data")}>
              Data
            </Button>
          </div>

          {activeTab === "data" ? (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>Cloud Storage</CardTitle>
                    <CardDescription>Upload and restore Loop Forge backup data through Dropbox.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-white/45 p-4 dark:bg-white/5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <img src={dropboxLogo} alt="Dropbox" className="h-10 w-10 rounded-md object-contain" />
                            <p className="m-0 text-base font-semibold text-foreground">Dropbox</p>
                          </div>
                          <p className="m-0 text-sm text-muted-foreground">Upload or restore the browser app&apos;s persisted JSON backup file.</p>
                          <p className="m-0 text-sm text-muted-foreground">
                            Status: {syncMetadata.isConnected ? "Connected" : "Not connected"}
                          </p>
                          <p className="m-0 text-sm text-muted-foreground">Account: {syncMetadata.accountName || "No account connected"}</p>
                          <p className="m-0 text-sm text-muted-foreground">Last upload: {formatTimestamp(syncMetadata.lastUploadAt)}</p>
                          <p className="m-0 text-sm text-muted-foreground">Last download: {formatTimestamp(syncMetadata.lastDownloadAt)}</p>
                          <p className="m-0 text-sm text-muted-foreground">
                            File: {primaryArrangementFile?.name ?? "Arrangement Library"} backup
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleConnectDropbox}
                            disabled={isSyncBusy || syncMetadata.isConnected}
                            title={syncMetadata.isConnected ? "Dropbox already connected" : "Connect to Dropbox"}
                            aria-label={syncMetadata.isConnected ? "Dropbox already connected" : "Connect to Dropbox"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                              <path d="M8 12h8" />
                              <path d="M12 8v8" />
                              <path d="M21 12a9 9 0 1 1-3.2-6.9" />
                            </svg>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleUploadDropbox}
                            disabled={!syncMetadata.isConnected || isSyncBusy}
                            title="Upload backup to Dropbox"
                            aria-label="Upload backup to Dropbox"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                              <path d="M12 16V4" />
                              <path d="m7 9 5-5 5 5" />
                              <path d="M4 20h16" />
                            </svg>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleDownloadDropbox}
                            disabled={!syncMetadata.isConnected || isSyncBusy}
                            title="Download backup from Dropbox"
                            aria-label="Download backup from Dropbox"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                              <path d="M12 4v12" />
                              <path d="m17 11-5 5-5-5" />
                              <path d="M4 20h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {syncStatus.trim().length > 0 ? (
                      <div className="rounded-md border border-border bg-white/45 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5">
                        {syncStatus}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="grid gap-5">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle>Application Data</CardTitle>
                      <CardDescription>Export all managed JSON data or restore it from a backup file.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button type="button" onClick={handleExportBackup}>
                        Backup
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => importInputRef.current?.click()}>
                        Restore Backup
                      </Button>
                      <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle>LocalDB</CardTitle>
                      <CardDescription>Approximate browser storage usage for this application.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                      <StorageUsageDonut usedBytes={displayUsedBytes} freeBytes={freeBytes} totalBytes={TOTAL_STORAGE_BYTES} offset={donutOffset} />
                      <div className="w-full space-y-1 text-sm text-muted-foreground">
                        <p className="m-0">Used: {formatStorageMb(displayUsedBytes)}</p>
                        <p className="m-0">Free: {formatStorageMb(freeBytes)}</p>
                        <p className="m-0">Total: {formatStorageMb(TOTAL_STORAGE_BYTES)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Shows the files the app stores in browser LocalStorage and lets you delete them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button type="button" variant="secondary" onClick={handleDeleteAllFiles} disabled={!storageFiles.some((file) => file.exists)}>
                      Delete All
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-white/45 dark:bg-white/5">
                        <tr className="text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Description</th>
                          <th className="px-4 py-3 font-semibold">Records</th>
                          <th className="px-4 py-3 font-semibold">Size</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageFiles.map((file) => (
                          <tr key={file.key} className="border-t border-border bg-card/70">
                            <td className="px-4 py-3 align-top font-medium text-foreground">{file.key}</td>
                            <td className="px-4 py-3 align-top text-muted-foreground">{file.description}</td>
                            <td className="px-4 py-3 align-top text-muted-foreground">{file.recordCount}</td>
                            <td className="px-4 py-3 align-top text-muted-foreground">{formatStorageKb(file.bytes)}</td>
                            <td className="px-4 py-3 text-right align-top">
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleDeleteFile(file)} disabled={!file.exists}>
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Arrangement Library Domain</CardTitle>
                  <CardDescription>Reflection-style visualization of the primary arrangement data model stored in LocalStorage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-border bg-white/45 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5">
                    Primary file: {primaryArrangementFile?.key ?? APP_STORAGE_KEYS.arrangements}
                    {" · "}
                    Records: {arrangements.length}
                  </div>
                  <div className="rounded-md border border-border bg-white/35 p-3 dark:bg-white/5">
                    <ObjectExplorer
                      name="StoredArrangements"
                      value={arrangementDomainData}
                      path="root"
                      expandedPaths={expandedPaths}
                      onToggle={togglePath}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );

  function refreshInsights() {
    setStorageFiles(getManagedStorageSnapshots());
    setUsedBytes(getBrowserStorageUsageBytes());
    const authState = loadDropboxAuthState();
    const storedSyncMetadata = loadSyncMetadata();

    setSyncMetadata({
      ...storedSyncMetadata,
      isConnected: authState !== null,
      accountName: authState?.accountDisplayName || storedSyncMetadata.accountName,
    });
  }

  function updateSyncMetadata(updater: (current: SyncMetadata) => SyncMetadata) {
    setSyncMetadata((current) => {
      const next = updater(current);
      window.localStorage.setItem(APP_STORAGE_KEYS.syncMetadata, JSON.stringify(next));
      return next;
    });
  }
}

function StorageUsageDonut({
  usedBytes,
  freeBytes,
  totalBytes,
  offset,
}: {
  usedBytes: number;
  freeBytes: number;
  totalBytes: number;
  offset: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 120 120" className="h-[220px] w-[220px]">
        <circle cx="60" cy="60" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 42}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
          LocalDB
        </text>
        <text x="60" y="72" textAnchor="middle" className="fill-muted-foreground text-[8px]">
          {Math.round((usedBytes / totalBytes) * 100)}% used
        </text>
      </svg>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Used
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--muted))]" />
          Free
        </span>
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        {formatStorageMb(usedBytes)} used · {formatStorageMb(freeBytes)} free
      </p>
    </div>
  );
}

function ObjectExplorer({
  name,
  value,
  path,
  expandedPaths,
  onToggle,
}: {
  name: string;
  value: unknown;
  path: string;
  expandedPaths: Record<string, boolean>;
  onToggle: (path: string) => void;
}) {
  const isExpandable = isObjectValue(value) || Array.isArray(value);
  const isExpanded = expandedPaths[path] ?? path === "root";

  if (!isExpandable) {
    return (
      <div className="grid grid-cols-[minmax(180px,240px)_1fr] gap-3 border-t border-border/70 px-2 py-2 text-sm first:border-t-0">
        <span className="font-medium text-foreground">{name}</span>
        <span className="break-all text-muted-foreground">{formatPrimitive(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((entry, index) => [`[${index}]`, entry] as const)
    : Object.entries(value);

  return (
    <div className="rounded-md border border-border/70 bg-card/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        onClick={() => onToggle(path)}
      >
        <span className="font-medium text-foreground">
          {name} <span className="text-muted-foreground">{describeValue(value)}</span>
        </span>
        <span className="text-muted-foreground">{isExpanded ? "−" : "+"}</span>
      </button>
      {isExpanded ? (
        <div className="border-t border-border/70 p-2">
          {entries.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">No data</div>
          ) : (
            entries.map(([entryName, entryValue]) => (
              <Fragment key={`${path}.${entryName}`}>
                <ObjectExplorer
                  name={entryName}
                  value={entryValue}
                  path={`${path}.${entryName}`}
                  expandedPaths={expandedPaths}
                  onToggle={onToggle}
                />
              </Fragment>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function loadSyncMetadata(): SyncMetadata {
  const json = window.localStorage.getItem(APP_STORAGE_KEYS.syncMetadata);

  if (!json) {
    return DEFAULT_SYNC_METADATA;
  }

  try {
    const parsed = JSON.parse(json) as Partial<SyncMetadata>;
    return {
      providerName: typeof parsed.providerName === "string" ? parsed.providerName : DEFAULT_SYNC_METADATA.providerName,
      accountName: typeof parsed.accountName === "string" ? parsed.accountName : DEFAULT_SYNC_METADATA.accountName,
      isConnected: typeof parsed.isConnected === "boolean" ? parsed.isConnected : DEFAULT_SYNC_METADATA.isConnected,
      lastUploadAt: typeof parsed.lastUploadAt === "string" ? parsed.lastUploadAt : DEFAULT_SYNC_METADATA.lastUploadAt,
      lastDownloadAt: typeof parsed.lastDownloadAt === "string" ? parsed.lastDownloadAt : DEFAULT_SYNC_METADATA.lastDownloadAt,
    };
  } catch {
    return DEFAULT_SYNC_METADATA;
  }
}

function downloadTextFile(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatTimestamp(value: string): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatTimestampForFilename(value: string): string {
  return value.replace(/[:.]/g, "-");
}

function formatStorageMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatStorageKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatPrimitive(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value.length === 0 ? '""' : value;
  }

  return String(value);
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `(${value.length})`;
  }

  if (isObjectValue(value)) {
    return `(${Object.keys(value).length} fields)`;
  }

  return "";
}
