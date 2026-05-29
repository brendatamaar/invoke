import { deriveKeyFromPassphrase, generateSalt } from "@invoke/core";
import { coreStore } from "../../store";

function promptPassphrase(
  mode: "setup" | "unlock",
  set: (partial: any) => void,
): Promise<string | null> {
  return new Promise((resolve) => {
    set({
      showPassphraseModal: true,
      passphraseMode: mode,
      passphraseCallback: resolve,
    });
  });
}

async function deriveAndStoreCryptoKey(passphrase: string): Promise<void> {
  const [saltResult, core] = await Promise.all([generateSalt(), import("@invoke/core")]);
  const key = await core.deriveKey(passphrase, saltResult.salt);
  return coreStore.initializeCrypto(key, saltResult.saltBase64);
}

/** Ensure the crypto key is loaded, prompting for passphrase if needed. */
export async function ensureCryptoKey(set: (partial: any) => void): Promise<boolean> {
  if (coreStore.hasCryptoKey()) return true;
  const saltBase64 = await coreStore.getCryptoSalt();
  if (!saltBase64) {
    const passphrase = await promptPassphrase("setup", set);
    if (!passphrase) return false;
    await deriveAndStoreCryptoKey(passphrase);
    return true;
  }
  const passphrase = await promptPassphrase("unlock", set);
  if (!passphrase) return false;
  const key = await deriveKeyFromPassphrase(passphrase, saltBase64);
  const valid = await coreStore.verifyCryptoKey(key);
  if (!valid) return false;
  coreStore.setCryptoKey(key);
  return true;
}

/** Call on app load to auto-unlock if encrypted entries exist. */
export async function checkAndUnlockOnStartup(set: (partial: any) => void): Promise<void> {
  const hasSalt = await coreStore.hasSalt();
  if (!hasSalt) return;
  await ensureCryptoKey(set);
}
