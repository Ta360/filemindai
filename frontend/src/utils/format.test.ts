import { describe, it, expect } from "vitest";
import { formatBytes, fileKindLabel } from "./format";

describe("formatBytes", () => {
  it("formats bytes into human-readable units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("returns an em dash for null", () => {
    expect(formatBytes(null)).toBe("—");
  });
});

describe("fileKindLabel", () => {
  it("maps known kinds to display labels", () => {
    expect(fileKindLabel("pdf")).toBe("PDF");
    expect(fileKindLabel("spreadsheet")).toBe("Spreadsheet");
  });

  it("falls back to File for unknown kinds", () => {
    expect(fileKindLabel("bogus")).toBe("File");
  });
});
