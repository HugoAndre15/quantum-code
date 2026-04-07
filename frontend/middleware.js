import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("accessToken");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
