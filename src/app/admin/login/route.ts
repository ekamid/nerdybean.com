import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions, requireEnv } from "@/lib/admin/session";

/** Step 1 of signing in: send the browser to GitHub. `state` is a random value we check on the way back. */
export function GET(request: Request) {
  let clientId: string;
  try {
    clientId = requireEnv("GITHUB_CLIENT_ID");
    requireEnv("GITHUB_CLIENT_SECRET");
    requireEnv("ADMIN_SESSION_SECRET");
  } catch (error) {
    return new Response(`Admin sign-in isn't set up yet.\n\n${(error as Error).message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const state = randomBytes(16).toString("hex");
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", clientId);
  github.searchParams.set("redirect_uri", new URL("/admin/callback", request.url).toString());
  github.searchParams.set("state", state);
  github.searchParams.set("allow_signup", "false");
  // No `scope`: the token can only read your public profile, which is all we need.

  const response = NextResponse.redirect(github);
  response.cookies.set("admin_oauth_state", state, { ...cookieOptions, maxAge: 600 });
  return response;
}
