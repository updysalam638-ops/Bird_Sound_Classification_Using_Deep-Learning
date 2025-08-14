import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access")?.value

  // Protect only "/"
  const isHomePage = request.nextUrl.pathname === "/"

  if (isHomePage && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

// ✅ Match only the root route "/"
export const config = {
  matcher: ["/"],
}
