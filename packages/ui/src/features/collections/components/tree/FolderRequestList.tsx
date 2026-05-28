import type { SavedRequest } from "@invoke/core";
import { CollectionRequestNode } from "../CollectionRequestNode";

export function FolderRequestList({
  requests,
  collectionId,
  dragOverIndex,
  onItemDragOver,
  onListDragLeave,
  onListDrop,
}: {
  requests: SavedRequest[];
  collectionId: string;
  dragOverIndex: number | null;
  onItemDragOver: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onListDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onListDrop: (event: React.DragEvent) => void;
}) {
  return (
    <div className="ml-3" onDragLeave={onListDragLeave} onDrop={onListDrop}>
      {requests.map((request, index) => (
        <div key={request.id} onDragOver={(event) => onItemDragOver(event, index)}>
          {dragOverIndex === index && <DropIndicator />}
          <CollectionRequestNode request={request} collectionId={collectionId} />
        </div>
      ))}
      {dragOverIndex === requests.length && <DropIndicator />}
    </div>
  );
}

function DropIndicator() {
  return <div className="mx-2 h-0.5 rounded bg-[var(--accent,#3b82f6)]" />;
}
