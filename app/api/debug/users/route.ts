import { NextResponse } from "next/server"
import { getUsers } from "@/lib/storage"

export async function GET() {
  try {
    const users = await getUsers()

    // Don't expose passwords in production
    const sanitizedUsers = users.map(({ password, ...user }) => ({
      ...user,
      passwordSet: !!password,
    }))

    return NextResponse.json({
      success: true,
      userCount: users.length,
      users: sanitizedUsers,
    })
  } catch (error) {
    console.error("Debug users error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
