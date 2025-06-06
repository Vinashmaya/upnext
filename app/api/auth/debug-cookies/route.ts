import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()

    // Get auth token specifically
    const authToken = cookieStore.get("auth-token")

    return NextResponse.json({
      success: true,
      cookies: allCookies.map((cookie) => ({
        name: cookie.name,
        value:
          cookie.name === "auth-token"
            ? `${cookie.value.substring(0, 10)}...`
            : // Only show part of the token for security
              cookie.value,
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      })),
      authTokenExists: !!authToken,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Debug cookies error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
