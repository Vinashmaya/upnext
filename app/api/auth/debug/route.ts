import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/storage"

export async function GET() {
  try {
    console.log("Debug auth endpoint called")

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authToken = cookieStore.get("auth-token")

    console.log(
      "All cookies:",
      allCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
    )
    console.log("Auth token exists:", !!authToken)

    let sessionInfo = null
    if (authToken?.value) {
      try {
        sessionInfo = await verifySession(authToken.value)
        console.log("Session verification result:", !!sessionInfo)
      } catch (error) {
        console.log("Session verification error:", error.message)
      }
    }

    return NextResponse.json({
      success: true,
      cookies: allCookies.map((cookie) => ({
        name: cookie.name,
        hasValue: !!cookie.value,
        valueLength: cookie.value?.length || 0,
      })),
      authTokenExists: !!authToken,
      sessionValid: !!sessionInfo,
      sessionInfo: sessionInfo
        ? {
            username: sessionInfo.username,
            role: sessionInfo.role,
            expiresAt: sessionInfo.expiresAt,
          }
        : null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Debug auth error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
