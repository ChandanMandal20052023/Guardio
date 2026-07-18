import { Transaction } from "@/types/mockData";

export type DisplayStatus = "safe" | "suspicious" | "approved" | "rejected";

export function getDisplayStatus(t: Transaction): DisplayStatus {
  if (t.status === "safe") return "safe";
  if (t.user_response === "rejected") return "rejected";
  if (t.user_response === "approved") return "approved";
  return "suspicious";
}