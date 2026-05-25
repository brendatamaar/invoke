export type InnerTab = "messages" | "headers" | "auth" | "options";
export type WsDirection = "sent" | "received" | "system";
export type DirectionFilter = "all" | WsDirection;

export interface MsgTemplate {
  label: string;
  body: string;
  type: "text" | "binary";
}

export interface SavedMessageDraft {
  label: string;
  body: string;
  type: "text" | "binary";
  autoSend: boolean;
}

export const INNER_TABS: { id: InnerTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "headers", label: "Headers" },
  { id: "auth", label: "Auth" },
  { id: "options", label: "Options" },
];
