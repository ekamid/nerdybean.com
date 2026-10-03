import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** The only GitHub account allowed into /admin. */
export const adminLogin = "ekamid";

/**
 * How signing in works:
 * 1. /admin/login sends you to GitHub, which asks you to approve the OAuth App.
 * 2. GitHub sends you back to /admin/callback with a one-time code. The server swaps the code for
 *    a token, asks GitHub who you are, and throws the token away (it has no permissions anyway).
 * 3. If you are `adminLogin`, the server sets a signed session cookie: "<login>.<expiry>.<signature>".
 *    The signature is an HMAC made with ADMIN_SESSION_SECRET, so the cookie can't be forged or edited.
 */
const cookieName = "admin_session";
const maxAge = 60 * 60 * 24 * 7; // a week

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

function sign(value: string) {
  const secret = requireEnv("ADMIN_SESSION_SECRET");
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" } as const;

/** The session cookie to set after a successful GitHub sign-in. */
export function sessionCookie(login: string) {
  const value = `${login}.${Date.now() + maxAge * 1000}`;
  return { name: cookieName, value: `${value}.${sign(value)}`, ...cookieOptions, maxAge };
}
export const clearedSessionCookie = { name: cookieName, value: "", ...cookieOptions, maxAge: 0 };

/** The signed-in admin's GitHub login, or null. */
export async function currentAdmin(): Promise<string | null> {
  const [login, expires, signature] = ((await cookies()).get(cookieName)?.value ?? "").split(".");
  if (!login || !expires || !signature) return null;
  const expected = Buffer.from(sign(`${login}.${expires}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(expires) < Date.now()) return null;
  return login.toLowerCase() === adminLogin.toLowerCase() ? login : null;
}

/** For admin pages: send anyone who isn't signed in to the /admin sign-in screen. */
export async function requireAdmin() {
  const login = await currentAdmin();
  if (!login) redirect("/admin");
  return login;
}
