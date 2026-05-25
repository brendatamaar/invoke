import { useState } from "react";
import type { InnerTab } from "../types";
import { WebSocketInnerTabs } from "./WebSocketInnerTabs";
import { WebSocketSessionTabs } from "./WebSocketSessionTabs";
import { AuthTab } from "./tabs/AuthTab";
import { HeadersTab } from "./tabs/HeadersTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { OptionsTab } from "./tabs/OptionsTab";

export function WebSocketClient() {
  const [innerTab, setInnerTab] = useState<InnerTab>("messages");

  return (
    <div className="flex flex-col h-full">
      <WebSocketSessionTabs />
      <WebSocketInnerTabs innerTab={innerTab} onChange={setInnerTab} />
      {innerTab === "messages" && <MessagesTab />}
      {innerTab === "headers" && <HeadersTab />}
      {innerTab === "auth" && <AuthTab />}
      {innerTab === "options" && <OptionsTab />}
    </div>
  );
}
