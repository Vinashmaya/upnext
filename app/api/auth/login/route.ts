import { NextResponse } from "next/server"
import { getUserByUsername, createSession, addAuditLogEntry } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    console.log("Login attempt for username:", username)

    // Get user from Redis
    const user = await getUserByUsername(username)

    if (!user) {
      console.log("Login failed - user not found")

      // Log failed login attempt
      await addAuditLogEntry({
        action: "login_failed",
        user: username || "unknown",
        source: "login-page",
        details: "Failed login attempt - user not found",
      })

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check password (in production, use proper password hashing)
    if (password === user.password) {
      console.log("Login successful, creating session...")

      // Create session token
      const token = await createSession(user)
      console.log("Session token created successfully")

      // Log successful login
      await addAuditLogEntry({
        action: "login",
        user: username,
        source: "login-page",
        details: `Successful login as ${user.role}`,
      })

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        token, // Also return token for localStorage fallback
      })

      // Set cookie with explicit settings
      response.cookies.set({
        name: "auth-token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      console.log("Cookie set successfully")
      return response
    } else {
      console.log("Login failed - invalid password")

      // Log failed login attempt
      await addAuditLogEntry({
        action: "login_failed",
        user: username || "unknown",
        source: "login-page",
        details: "Failed login attempt - invalid password",
      })

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
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
