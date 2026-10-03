import { NextResponse } from "next/server";
import { clearedSessionCookie, publicUrl } from "@/lib/admin/session";

export function POST(request: Request) {
  const response = NextResponse.redirect(publicUrl("/admin", request), 303);
  response.cookies.set(clearedSessionCookie);
  return response;
}
