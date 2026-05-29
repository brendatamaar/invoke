import { Schema } from "effect";

export const KeyValueSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
  sensitive: Schema.optional(Schema.Boolean),
});

export const CollectionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  variables: Schema.optional(Schema.Array(KeyValueSchema)),
  sortOrder: Schema.optional(Schema.Number),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
});

export const FolderSchema = Schema.Struct({
  id: Schema.String,
  collectionId: Schema.String,
  parentFolderId: Schema.optional(Schema.NullishOr(Schema.String)),
  name: Schema.String,
  description: Schema.optional(Schema.String),
  variables: Schema.optional(Schema.Array(KeyValueSchema)),
  sortOrder: Schema.Number,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
});

export const EnvironmentSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  variables: Schema.Array(KeyValueSchema),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
});
