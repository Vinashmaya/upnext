import { NextResponse } from "next/server"
import { initializeDefaultUsers, testRedisConnection } from "@/lib/storage"

export async function GET() {
  try {
    // Test Redis connection
    const redisTest = await testRedisConnection()

    if (!redisTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to connect to Redis",
          details: redisTest,
        },
        { status: 500 },
      )
    }

    // Initialize default users and data structures
    await initializeDefaultUsers()

    return NextResponse.json({
      success: true,
      message: "System initialized successfully",
      redis: redisTest,
    })
  } catch (error) {
    console.error("Initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize system",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
