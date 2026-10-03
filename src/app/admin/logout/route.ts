import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/admin/session";

export function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(clearedSessionCookie);
  return response;
}
