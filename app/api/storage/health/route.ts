import { NextResponse } from "next/server"
import { checkStorageHealth, getStorageInfo, testRedisConnection } from "@/lib/storage"

export async function GET() {
  try {
    const health = await checkStorageHealth()
    const info = getStorageInfo()
    const redisTest = await testRedisConnection()

    return NextResponse.json({
      ...health,
      storage: info,
      redis: redisTest,
      environment: {
        hasRedisUrl: !!process.env.KV_REST_API_URL,
        hasRedisToken: !!process.env.KV_REST_API_TOKEN,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        message: `Health check failed: ${error.message}`,
        storage: getStorageInfo(),
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
