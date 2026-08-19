import { describe, it, expect } from "vitest";
import { buildAnalytics } from "./analyticsService";
import type { DriveFile } from "../../../../shared/types";

function file(overrides: Partial<DriveFile>): DriveFile {
  return {
    id: "id",
    name: "file",
    mimeType: "application/pdf",
    kind: "pdf",
    size: 1024,
    createdTime: null,
    modifiedTime: "2026-03-15T00:00:00.000Z",
    owners: [],
    parents: [],
    parentName: "Marketing",
    webViewLink: null,
    webContentLink: null,
    thumbnailLink: null,
    iconLink: null,
    description: null,
    isFolder: false,
    ...overrides,
  };
}

describe("buildAnalytics", () => {
  it("counts files by kind from real Drive metadata only", () => {
    const files = [
      file({ kind: "pdf" }),
      file({ kind: "pdf" }),
      file({ kind: "image", mimeType: "image/png" }),
      file({ kind: "video", mimeType: "video/mp4" }),
    ];
    const result = buildAnalytics(files, 3);
    expect(result.totalFiles).toBe(4);
    expect(result.totalFolders).toBe(3);
    expect(result.pdfCount).toBe(2);
    expect(result.imageCount).toBe(1);
    expect(result.videoCount).toBe(1);
  });

  it("groups files by parent folder name", () => {
    const files = [file({ parentName: "Marketing" }), file({ parentName: "Marketing" }), file({ parentName: "Finance" })];
    const result = buildAnalytics(files, 0);
    const marketing = result.filesByFolder.find((f) => f.label === "Marketing");
    expect(marketing?.value).toBe(2);
  });

  it("returns an empty chart-ready array when there are no files", () => {
    const result = buildAnalytics([], 0);
    expect(result.filesByType).toEqual([]);
    expect(result.totalFiles).toBe(0);
  });
});
