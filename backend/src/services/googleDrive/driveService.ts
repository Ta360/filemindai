import { google, drive_v3 } from "googleapis";
import { getAuthorizedClient } from "./oauthService";
import type { DriveFile, DriveFolder, DriveFileKind } from "../../../../shared/types";

const FILE_FIELDS =
  "id, name, mimeType, size, createdTime, modifiedTime, owners(displayName,emailAddress), parents, webViewLink, webContentLink, thumbnailLink, iconLink, description";

const FOLDER_FIELDS = "id, name, modifiedTime, parents, webViewLink, iconLink";

function classifyMime(mimeType: string): DriveFileKind {
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("spreadsheet") || mimeType.includes("ms-excel")) return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("ms-powerpoint")) return "presentation";
  if (mimeType.includes("document") || mimeType.includes("ms-word") || mimeType === "text/plain") return "document";
  return "other";
}

async function drive(userId: string): Promise<drive_v3.Drive> {
  const auth = await getAuthorizedClient(userId);
  return google.drive({ version: "v3", auth });
}

const folderNameCache = new Map<string, string>();

async function resolveParentName(client: drive_v3.Drive, parentId: string | undefined): Promise<string | null> {
  if (!parentId) return null;
  if (folderNameCache.has(parentId)) return folderNameCache.get(parentId)!;
  try {
    const { data } = await client.files.get({ fileId: parentId, fields: "name" });
    if (data.name) folderNameCache.set(parentId, data.name);
    return data.name ?? null;
  } catch {
    return null;
  }
}

function toDriveFile(f: drive_v3.Schema$File, parentName: string | null): DriveFile {
  return {
    id: f.id!,
    name: f.name ?? "Untitled",
    mimeType: f.mimeType ?? "application/octet-stream",
    kind: classifyMime(f.mimeType ?? ""),
    size: f.size ? Number(f.size) : null,
    createdTime: f.createdTime ?? null,
    modifiedTime: f.modifiedTime ?? null,
    owners: (f.owners ?? []).map((o) => o.displayName ?? o.emailAddress ?? "Unknown"),
    parents: f.parents ?? [],
    parentName,
    webViewLink: f.webViewLink ?? null,
    webContentLink: f.webContentLink ?? null,
    thumbnailLink: f.thumbnailLink ?? null,
    iconLink: f.iconLink ?? null,
    description: f.description ?? null,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
  };
}

export interface DriveSearchOptions {
  query?: string;
  mimeTypeGroup?: "pdf" | "document" | "spreadsheet" | "presentation" | "image" | "video" | "audio";
  parentFolderId?: string;
  modifiedAfter?: string; // ISO date
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
}

const MIME_GROUP_QUERY: Record<string, string> = {
  pdf: "mimeType = 'application/pdf'",
  document: "(mimeType = 'application/vnd.google-apps.document' or mimeType contains 'word')",
  spreadsheet: "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'excel' or mimeType contains 'sheet')",
  presentation: "(mimeType = 'application/vnd.google-apps.presentation' or mimeType contains 'presentation')",
  image: "mimeType contains 'image/'",
  video: "mimeType contains 'video/'",
  audio: "mimeType contains 'audio/'",
};

function buildQuery(opts: DriveSearchOptions, foldersOnly: boolean): string {
  const clauses: string[] = ["trashed = false"];
  if (foldersOnly) {
    clauses.push("mimeType = 'application/vnd.google-apps.folder'");
  } else {
    clauses.push("mimeType != 'application/vnd.google-apps.folder'");
  }
  if (opts.query) {
    const escaped = opts.query.replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  }
  if (opts.mimeTypeGroup && MIME_GROUP_QUERY[opts.mimeTypeGroup]) {
    clauses.push(MIME_GROUP_QUERY[opts.mimeTypeGroup]);
  }
  if (opts.parentFolderId) {
    clauses.push(`'${opts.parentFolderId}' in parents`);
  }
  if (opts.modifiedAfter) {
    clauses.push(`modifiedTime > '${opts.modifiedAfter}'`);
  }
  return clauses.join(" and ");
}

export async function searchFiles(userId: string, opts: DriveSearchOptions): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
  const client = await drive(userId);
  const { data } = await client.files.list({
    q: buildQuery(opts, false),
    fields: `nextPageToken, files(${FILE_FIELDS})`,
    pageSize: opts.pageSize ?? 25,
    pageToken: opts.pageToken,
    orderBy: opts.orderBy ?? "modifiedTime desc",
  });

  const files: DriveFile[] = [];
  for (const f of data.files ?? []) {
    const parentName = await resolveParentName(client, f.parents?.[0] ?? undefined);
    files.push(toDriveFile(f, parentName));
  }
  return { files, nextPageToken: data.nextPageToken ?? null };
}

export async function searchFolders(userId: string, opts: DriveSearchOptions): Promise<{ folders: DriveFolder[]; nextPageToken: string | null }> {
  const client = await drive(userId);
  const { data } = await client.files.list({
    q: buildQuery(opts, true),
    fields: `nextPageToken, files(${FOLDER_FIELDS})`,
    pageSize: opts.pageSize ?? 25,
    pageToken: opts.pageToken,
    orderBy: opts.orderBy ?? "modifiedTime desc",
  });

  const folders: DriveFolder[] = [];
  for (const f of data.files ?? []) {
    const parentName = await resolveParentName(client, f.parents?.[0] ?? undefined);
    folders.push({
      id: f.id!,
      name: f.name ?? "Untitled",
      modifiedTime: f.modifiedTime ?? null,
      parents: f.parents ?? [],
      parentName,
      webViewLink: f.webViewLink ?? null,
      iconLink: f.iconLink ?? null,
      childCount: null,
    });
  }
  return { folders, nextPageToken: data.nextPageToken ?? null };
}

export async function getFileMetadata(userId: string, fileId: string): Promise<DriveFile> {
  const client = await drive(userId);
  const { data } = await client.files.get({ fileId, fields: FILE_FIELDS });
  const parentName = await resolveParentName(client, data.parents?.[0] ?? undefined);
  return toDriveFile(data, parentName);
}

/**
 * Streams file bytes through our backend using the user's own OAuth token so
 * private files can be previewed/downloaded without ever making them public.
 */
export async function streamFile(userId: string, fileId: string, rangeHeader?: string) {
  const client = await drive(userId);
  const res = await client.files.get(
    { fileId, alt: "media" },
    { responseType: "stream", headers: rangeHeader ? { Range: rangeHeader } : undefined }
  );
  return { stream: res.data, status: res.status, headers: res.headers as Record<string, string> };
}
