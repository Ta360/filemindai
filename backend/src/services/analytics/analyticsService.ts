import type { ChartDatum, DriveAnalytics, DriveFile } from "../../../../shared/types";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/**
 * Builds a normalized analytics snapshot purely from real Drive file
 * metadata already returned by the Drive API. No synthetic/demo numbers.
 */
export function buildAnalytics(files: DriveFile[], folderCount: number): DriveAnalytics {
  let pdfCount = 0;
  let documentCount = 0;
  let spreadsheetCount = 0;
  let presentationCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let otherCount = 0;

  const byFolder = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const f of files) {
    switch (f.kind) {
      case "pdf":
        pdfCount++;
        break;
      case "document":
        documentCount++;
        break;
      case "spreadsheet":
        spreadsheetCount++;
        break;
      case "presentation":
        presentationCount++;
        break;
      case "image":
        imageCount++;
        break;
      case "video":
        videoCount++;
        break;
      default:
        otherCount++;
    }

    const folderLabel = f.parentName ?? "My Drive";
    byFolder.set(folderLabel, (byFolder.get(folderLabel) ?? 0) + 1);

    if (f.modifiedTime) {
      const label = MONTH_FORMAT.format(new Date(f.modifiedTime));
      byMonth.set(label, (byMonth.get(label) ?? 0) + 1);
    }
  }

  const filesByType: ChartDatum[] = [
    { label: "PDF", value: pdfCount, color: "#ef4444" },
    { label: "Documents", value: documentCount, color: "#3b82f6" },
    { label: "Spreadsheets", value: spreadsheetCount, color: "#22c55e" },
    { label: "Presentations", value: presentationCount, color: "#f59e0b" },
    { label: "Images", value: imageCount, color: "#a855f7" },
    { label: "Videos", value: videoCount, color: "#ec4899" },
    { label: "Other", value: otherCount, color: "#64748b" },
  ].filter((d) => d.value > 0);

  const filesByFolder: ChartDatum[] = Array.from(byFolder.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  const filesByMonth: ChartDatum[] = Array.from(byMonth.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([label, value]) => ({ label, value }));

  return {
    totalFiles: files.length,
    totalFolders: folderCount,
    pdfCount,
    documentCount,
    spreadsheetCount,
    presentationCount,
    imageCount,
    videoCount,
    otherCount,
    filesByFolder,
    filesByMonth,
    filesByType,
  };
}
