import { withAuth, NextRequestWithAuth} from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth (
  function middleware(request: NextRequestWithAuth) {
    console.log(request.nextUrl.pathname)
    console.log(request.nextauth.token)

    if (request.nextUrl.pathname.startsWith("/admin") &&
     request.nextauth.token?.role !== "admin") {
      return NextResponse.rewrite(
        new URL("/403", request.nextUrl)
      )
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
);
export const config = { matcher: "/admin/:path*" };