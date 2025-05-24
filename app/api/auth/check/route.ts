import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("admin-session")

    console.log("Auth check - session cookie:", session?.value)

    if (session && session.value === "authenticated") {
      return NextResponse.json({
        authenticated: true,
        sessionValue: session.value,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          authenticated: false,
          sessionValue: session?.value || "none",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
