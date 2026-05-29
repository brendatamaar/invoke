import { Schema } from "effect";

export const oauth2ClientCredentialsSchema = Schema.Struct({
  tokenUrl: Schema.String.pipe(Schema.minLength(1)),
  clientId: Schema.String.pipe(Schema.minLength(1)),
  clientSecret: Schema.optionalWith(Schema.String, { default: () => "" }),
  scope: Schema.optionalWith(Schema.String, { default: () => "" }),
});

export const oauth2AuthCodeStartSchema = Schema.Struct({
  authUrl: Schema.String.pipe(Schema.minLength(1)),
  tokenUrl: Schema.String.pipe(Schema.minLength(1)),
  clientId: Schema.String.pipe(Schema.minLength(1)),
  clientSecret: Schema.optionalWith(Schema.String, { default: () => "" }),
  scope: Schema.optionalWith(Schema.String, { default: () => "" }),
  redirectUri: Schema.String.pipe(Schema.minLength(1)),
  pkce: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  codeChallenge: Schema.optionalWith(Schema.String, { default: () => "" }),
  codeChallengeMethod: Schema.optionalWith(Schema.String, { default: () => "" }),
  codeVerifier: Schema.optionalWith(Schema.String, { default: () => "" }),
});

export const oauth2RefreshTokenSchema = Schema.Struct({
  tokenUrl: Schema.String.pipe(Schema.minLength(1)),
  clientId: Schema.optionalWith(Schema.String, { default: () => "" }),
  clientSecret: Schema.optionalWith(Schema.String, { default: () => "" }),
  refreshToken: Schema.String.pipe(Schema.minLength(1)),
});
