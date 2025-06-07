import { NextResponse } from "next/server"
import { getUsers, createUser, addAuditLogEntry, verifySession } from "@/lib/storage"
import { cookies } from "next/headers"

// Helper function to get session from request
async function getSessionFromRequest(request: Request) {
  let session = null

  // First try to get token from Authorization header
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    try {
      session = await verifySession(token)
      console.log("Session from Authorization header:", session?.username)
    } catch (error) {
      console.error("Error verifying token from header:", error)
    }
  }

  // If no session from header, try cookies
  if (!session) {
    try {
      const cookieStore = cookies()
      const token = cookieStore.get("auth-token")?.value

      if (token) {
        session = await verifySession(token)
        console.log("Session from cookie:", session?.username)
      }
    } catch (error) {
      console.error("Error getting session from cookies:", error)
    }
  }

  return session
}

// Get all users (manager only)
export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request)

    // Check if user is a manager
    if (!session || session.role !== "manager") {
      console.log("Unauthorized GET access:", session?.username, session?.role)
      return NextResponse.json({ error: "Unauthorized. Manager role required." }, { status: 403 })
    }

    const users = await getUsers()

    // Don't send passwords
    const sanitizedUsers = users.map(({ password, ...user }) => user)

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error("Error getting users:", error)
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 })
  }
}

// Create a new user (manager only)
export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request)

    // Check if user is a manager
    if (!session || session.role !== "manager") {
      console.log("Unauthorized POST access:", session?.username, session?.role)
      return NextResponse.json({ error: "Unauthorized. Manager role required." }, { status: 403 })
    }

    const userData = await request.json()

    // Validate required fields
    if (!userData.username || !userData.password || !userData.name || !userData.role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate role
    if (!["salesperson", "bdc", "manager"].includes(userData.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Create user
    const newUser = await createUser({
      username: userData.username,
      password: userData.password,
      name: userData.name,
      role: userData.role,
      email: userData.email,
      isActive: userData.isActive !== false, // Default to active if not specified
    })

    // Log the action
    await addAuditLogEntry({
      action: "create_user",
      user: session.username,
      source: "admin-dashboard",
      details: `Created new ${newUser.role} user: ${newUser.name} (${newUser.username})`,
    })

    // Don't send password back
    const { password, ...sanitizedUser } = newUser

    return NextResponse.json({ user: sanitizedUser })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 })
  }
}
