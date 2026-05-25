import type { RefObject } from "react";
import type { Collection, Folder } from "@invoke/core";
import {
  DestinationPicker,
  NEW_COLLECTION_SENTINEL,
  NEW_FOLDER_SENTINEL,
} from "./DestinationPicker";

export function SaveRequestForm({
  name,
  collectionId,
  folderId,
  newCollectionName,
  newFolderName,
  collections,
  availableFolders,
  inputRef,
  newColInputRef,
  newFolderInputRef,
  onNameChange,
  onCollectionChange,
  onFolderChange,
  onNewCollectionNameChange,
  onNewFolderNameChange,
}: {
  name: string;
  collectionId: string;
  folderId: string;
  newCollectionName: string;
  newFolderName: string;
  collections: Collection[];
  availableFolders: Folder[];
  inputRef: RefObject<HTMLInputElement | null>;
  newColInputRef: RefObject<HTMLInputElement | null>;
  newFolderInputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (value: string) => void;
  onCollectionChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onNewCollectionNameChange: (value: string) => void;
  onNewFolderNameChange: (value: string) => void;
}) {
  const isNewCollection = collectionId === NEW_COLLECTION_SENTINEL;
  const isNewFolder = folderId === NEW_FOLDER_SENTINEL;
  return (
    <div className="p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-3)]">Name</span>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Request name"
          className="input text-sm"
        />
      </label>
      <DestinationPicker
        collections={collections}
        folders={isNewCollection ? [] : availableFolders}
        collectionId={collectionId}
        folderId={folderId}
        onCollectionChange={onCollectionChange}
        onFolderChange={onFolderChange}
      />
      {isNewCollection && (
        <TextField
          label="Collection name"
          value={newCollectionName}
          inputRef={newColInputRef}
          placeholder="My Collection"
          onChange={onNewCollectionNameChange}
        />
      )}
      {isNewFolder && (
        <TextField
          label="Folder name"
          value={newFolderName}
          inputRef={newFolderInputRef}
          placeholder="My Folder"
          onChange={onNewFolderNameChange}
        />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  inputRef,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--text-3)]">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input text-sm"
      />
    </label>
  );
}
