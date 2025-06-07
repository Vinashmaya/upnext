import { NextResponse } from "next/server"
import { addAuditLogEntry, getSessionFromCookies } from "@/lib/storage"

export async function POST() {
  try {
    // Get current session
    const session = await getSessionFromCookies()

    // Log the logout
    await addAuditLogEntry({
      action: "logout",
      user: session?.username || "unknown",
      source: "navigation",
      details: `${session?.name || "User"} logged out`,
    })

    const response = NextResponse.json({ success: true })

    // Clear the auth token cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
