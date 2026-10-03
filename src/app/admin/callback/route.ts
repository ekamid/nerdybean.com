import { NextResponse, type NextRequest } from "next/server";
import { adminLogin, cookieOptions, publicUrl, requireEnv, sessionCookie } from "@/lib/admin/session";

/** Step 2 of signing in: GitHub sends the browser back here with a one-time code. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  // The state must match the cookie set in /admin/login, or this request didn't start here.
  if (!code || !state || state !== request.cookies.get("admin_oauth_state")?.value) {
    return new Response("Sign-in expired or was started elsewhere. Go back to /admin and try again.", { status: 400 });
  }

  // Swap the code for a token, then ask GitHub whose token it is.
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("GITHUB_CLIENT_ID"),
      client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: publicUrl("/admin/callback", request).toString(),
    }),
  });
  const { access_token: token } = (await tokenResponse.json()) as { access_token?: string };
  const user = token
    ? ((await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }).then((r) => (r.ok ? r.json() : null))) as { login?: string } | null)
    : null;

  if (!user?.login || user.login.toLowerCase() !== adminLogin.toLowerCase()) {
    return new Response("This admin is private.", { status: 403 });
  }
  // The token isn't kept; from here on the signed session cookie says who you are.
  const response = NextResponse.redirect(publicUrl("/admin", request));
  response.cookies.set(sessionCookie(user.login));
  response.cookies.set("admin_oauth_state", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
