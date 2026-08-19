export * from "@shared/types";

export type Theme = "light" | "dark";

export interface DriveConnection {
  connected: boolean;
  email?: string;
}
