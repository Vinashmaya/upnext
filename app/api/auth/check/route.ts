import { NextResponse } from "next/server"
import { verifySession } from "@/lib/storage"

export async function GET(request: Request) {
  try {
    console.log("Auth check API called")

    let token: string | undefined

    // First try to get token from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      console.log("Auth check: Using token from Authorization header")
    }

    // If no token from header, try cookie from request headers
    if (!token) {
      try {
        const cookieHeader = request.headers.get("cookie")
        console.log("Auth check: Cookie header exists:", !!cookieHeader)

        if (cookieHeader) {
          // Parse cookies manually
          const cookies = cookieHeader.split(";").reduce(
            (acc, cookie) => {
              const [name, value] = cookie.trim().split("=")
              if (name && value) {
                acc[name] = decodeURIComponent(value)
              }
              return acc
            },
            {} as Record<string, string>,
          )

          token = cookies["auth-token"]
          console.log("Auth check: Found auth-token in cookies:", !!token)
        }
      } catch (cookieError) {
        console.log("Auth check: Error parsing cookies:", cookieError.message)
      }
    }

    if (!token) {
      console.log("Auth check: No token found")
      return NextResponse.json({ error: "No authentication token" }, { status: 401 })
    }

    console.log("Auth check: Verifying token...")
    const session = await verifySession(token)

    if (!session) {
      console.log("Auth check: Invalid session")
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    console.log(`Auth check: Success for ${session.username} (${session.role})`)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        name: session.name,
        role: session.role,
      },
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      {
        error: "Authentication check failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
