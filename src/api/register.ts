import { startRegistration } from "@simplewebauthn/browser";

// Self-enrollment: runs ENTIRELY in the browser, never touches the server. The
// user generates a passkey and gets a base64 "enrollment string" to hand to an
// admin (who runs enroll.ts and adds it to USERS). The string carries the public
// key + userHandle — NOT the private key — so it is unique but not secret.

/** base64url without padding (browser has no built-in). */
function b64url(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Relying Party ID used at registration. It MUST match the backend `RP_ID`,
 * otherwise the credential is scoped to the wrong domain and login (which uses
 * the server-provided rpId) silently fails to find the key.
 *
 * Priority: explicit VITE_RP_ID → localhost/IP as-is → registrable parent
 * (last two labels, e.g. admin.zbiorkom.live → zbiorkom.live).
 */
export function relyingPartyId(): string {
  const env = import.meta.env.VITE_RP_ID;
  if (env) return env;
  const host = location.hostname;
  if (host === "localhost" || /^[\d.]+$/.test(host)) return host;
  const parts = host.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : host;
}

/**
 * Create a new passkey and return the enrollment string for the admin.
 *
 * @param username human-readable label shown in the authenticator + panel.
 * @returns btoa(JSON.stringify({ username, userHandle, regResponse }))
 */
export async function register(username: string): Promise<string> {
  const name = username.trim();
  if (!name) throw new Error("EMPTY_USERNAME");

  // Random account id — the passkey stores it and returns it at login, so the
  // stateless backend can identify the user WITHOUT a typed username.
  const userHandle = b64url(crypto.getRandomValues(new Uint8Array(16)));

  const regResponse = await startRegistration({
    optionsJSON: {
      // Local, unverified challenge — the admin's manual decision replaces the
      // usual server-side challenge verification.
      challenge: b64url(crypto.getRandomValues(new Uint8Array(32))),
      rp: { name: "zbiorkom.live · admin", id: relyingPartyId() },
      user: { id: userHandle, name, displayName: name },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        userVerification: "required", // PIN/biometria → drugi czynnik w jednym geście
        residentKey: "required", // discoverable → logowanie bez username
      },
      attestation: "none",
    },
  });

  return btoa(JSON.stringify({ username: name, userHandle, regResponse }));
}
