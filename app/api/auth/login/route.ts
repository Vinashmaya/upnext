import { NextResponse } from "next/server"
import { getAdminCredentials, addAuditLogEntry } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    console.log("Login attempt for username:", username)

    // Get admin credentials from Redis
    const adminCredentials = await getAdminCredentials()
    console.log("Loaded credentials for username:", adminCredentials.username)

    if (username === adminCredentials.username && password === adminCredentials.password) {
      console.log("Login successful")

      // Log successful login (don't fail if this fails)
      try {
        await addAuditLogEntry({
          action: "login",
          user: username,
          source: "login-page",
          details: "Successful admin login",
        })
      } catch (auditError) {
        console.error("Failed to log audit entry:", auditError)
      }

      const response = NextResponse.json({ success: true })

      // Set cookie
      response.cookies.set("admin-session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return response
    } else {
      console.log("Login failed - invalid credentials")

      // Log failed login attempt (don't fail if this fails)
      try {
        await addAuditLogEntry({
          action: "login_failed",
          user: username || "unknown",
          source: "login-page",
          details: "Failed login attempt",
        })
      } catch (auditError) {
        console.error("Failed to log audit entry:", auditError)
      }

      return NextResponse.json(
        {
          error: "Invalid credentials",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        error: "Login failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
