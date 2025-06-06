import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define routes that require authentication and their minimum role level
const protectedRoutes = [
  { path: "/admin", minRole: "bdc" },
  { path: "/admin/users", minRole: "manager" },
  { path: "/profile", minRole: "salesperson" },
]

// API routes that need protection - be more selective
const protectedApiRoutes = [
  { path: "/api/system-state", method: "POST", minRole: "bdc" },
  { path: "/api/users", minRole: "manager" },
  { path: "/api/leads/assign", method: "POST", minRole: "bdc" },
  { path: "/api/notifications/settings", minRole: "bdc" },
  { path: "/api/notifications/test", minRole: "bdc" },
  { path: "/api/notifications/send", minRole: "bdc" },
]

// Role hierarchy for permission checks
const roleHierarchy = {
  salesperson: 1,
  bdc: 2,
  manager: 3,
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const method = request.method

  console.log(`Middleware: ${method} ${path}`)

  // Allow all auth-related routes to pass through
  if (path.startsWith("/api/auth/") || path.startsWith("/login") || path === "/") {
    console.log(`Middleware: Allowing auth/public route ${path}`)
    return NextResponse.next()
  }

  // Allow GET requests to most API routes (for data fetching)
  if (path.startsWith("/api/") && method === "GET") {
    // Only protect specific GET routes
    const protectedGetRoutes = ["/api/users"]
    if (!protectedGetRoutes.some((route) => path.startsWith(route))) {
      console.log(`Middleware: Allowing GET request to ${path}`)
      return NextResponse.next()
    }
  }

  // Check if this is a protected route
  const isApiRoute = path.startsWith("/api/")
  let matchedRoute = null

  if (isApiRoute) {
    matchedRoute = protectedApiRoutes.find((route) => {
      if (path.startsWith(route.path)) {
        if (route.method && route.method !== method) {
          return false
        }
        return true
      }
      return false
    })
  } else {
    matchedRoute = protectedRoutes.find((route) => {
      return path.startsWith(route.path)
    })
  }

  // If route is not protected, continue
  if (!matchedRoute) {
    console.log(`Middleware: Route ${path} is not protected, continuing`)
    return NextResponse.next()
  }

  console.log(`Middleware: Route ${path} is protected, checking auth`)

  // Get auth token from cookies or Authorization header
  const token = request.cookies.get("auth-token")?.value || request.headers.get("Authorization")?.replace("Bearer ", "")

  // If no token, redirect to login (but not for API routes)
  if (!token) {
    console.log("Middleware: No token found")
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", encodeURIComponent(request.url))
    return NextResponse.redirect(url)
  }

  // For now, let requests with tokens pass through
  // We'll do the actual verification in the API routes themselves
  console.log("Middleware: Token found, allowing request")
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/api/system-state",
    "/api/users/:path*",
    "/api/leads/:path*",
    "/api/notifications/:path*",
  ],
}
