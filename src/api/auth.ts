import { startAuthentication } from "@simplewebauthn/browser";
import { authApi, ApiError } from "./client";
import type { MeResponse } from "./types";

/**
 * Full passkey login: fetch challenge → prompt authenticator → verify.
 *
 * The backend is stateless: the opaque `token` from /login/options carries the
 * signed challenge and is echoed, untouched, to /login/verify (which then sets
 * the HttpOnly `session` cookie). We never persist the token — it lives only for
 * the duration of this call.
 *
 * Returns the authenticated username on success; throws ApiError otherwise.
 */
export async function login(): Promise<string> {
  const { options, token } = await authApi.loginOptions();

  // No allowCredentials → the browser offers all matching discoverable passkeys.
  // startAuthentication returns userHandle automatically (resident key).
  const authResponse = await startAuthentication({ optionsJSON: options as never });

  const result = await authApi.loginVerify(authResponse, token);
  return result.username;
}

/** Current session, or null if unauthenticated. Used to bootstrap the UI. */
export function me(): Promise<MeResponse | null> {
  return authApi.me();
}

export async function logout(): Promise<void> {
  await authApi.logout();
}

/** True when the browser exposes the WebAuthn API at all. */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/** True when the user cancelled / dismissed the passkey prompt. */
export function isUserCancellation(err: unknown): boolean {
  if (err instanceof ApiError) return false;
  const name = (err as { name?: string })?.name;
  return name === "NotAllowedError" || name === "AbortError";
}
