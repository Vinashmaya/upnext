import { NextResponse } from "next/server"
import { getAdminCredentials, testRedisConnection } from "@/lib/storage"

export async function GET() {
  try {
    // Test Redis connection first
    const redisTest = await testRedisConnection()

    if (!redisTest.connected) {
      return NextResponse.json(
        {
          success: false,
          error: "Redis connection failed",
          details: redisTest,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Try to read admin credentials
    const credentials = await getAdminCredentials()

    return NextResponse.json({
      success: true,
      message: "Admin credentials loaded successfully",
      username: credentials.username,
      passwordSet: !!credentials.password,
      storage: "Upstash Redis",
      redis: redisTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
