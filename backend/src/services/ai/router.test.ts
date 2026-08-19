import { describe, it, expect } from "vitest";
import { routeDeterministic } from "./router";

describe("routeDeterministic", () => {
  it("routes /folders to DRIVE_FOLDER_SEARCH", () => {
    const r = routeDeterministic("/folders");
    expect(r?.intent).toBe("DRIVE_FOLDER_SEARCH");
    expect(r?.deterministic).toBe(true);
  });

  it("routes /images to IMAGE_PREVIEW", () => {
    expect(routeDeterministic("/images")?.intent).toBe("IMAGE_PREVIEW");
  });

  it("routes /videos to VIDEO_PREVIEW", () => {
    expect(routeDeterministic("/videos")?.intent).toBe("VIDEO_PREVIEW");
  });

  it("strips the command and keeps remaining text as cleanedQuery", () => {
    const r = routeDeterministic("/search marketing report");
    expect(r?.intent).toBe("DRIVE_SEARCH");
    expect(r?.cleanedQuery).toBe("marketing report");
  });

  it("returns null for natural language queries", () => {
    expect(routeDeterministic("find my resume")).toBeNull();
  });

  it("is case-insensitive on the command itself", () => {
    expect(routeDeterministic("/FOLDERS")?.intent).toBe("DRIVE_FOLDER_SEARCH");
  });
});
