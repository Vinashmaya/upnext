import { NextResponse } from "next/server"
import { addAuditLogEntry } from "@/lib/storage"

export async function POST() {
  try {
    // Log the logout
    await addAuditLogEntry({
      action: "logout",
      user: "admin",
      source: "navigation",
      details: "Admin logged out",
    })

    const response = NextResponse.json({ success: true })

    // Clear the session cookie
    response.cookies.set("admin-session", "", {
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
