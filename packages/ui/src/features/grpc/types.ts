export type GrpcTab = "message" | "metadata" | "auth" | "scripts" | "saved" | "stress" | "options";

export const GRPC_TABS: { id: GrpcTab; label: string }[] = [
  { id: "message", label: "Message" },
  { id: "metadata", label: "Metadata" },
  { id: "auth", label: "Auth" },
  { id: "scripts", label: "Scripts" },
  { id: "saved", label: "Saved" },
  { id: "stress", label: "Stress" },
  { id: "options", label: "Options" },
];
