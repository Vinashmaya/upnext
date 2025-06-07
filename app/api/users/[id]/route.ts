import { NextResponse } from "next/server"
import { getUserById, updateUser, deleteUser, addAuditLogEntry, verifySession } from "@/lib/storage"
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

// Get a specific user (manager only)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(request)

    // Check if user is a manager or the user themselves
    if (!session || (session.role !== "manager" && session.userId !== params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const user = await getUserById(params.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Don't send password
    const { password, ...sanitizedUser } = user

    return NextResponse.json({ user: sanitizedUser })
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 })
  }
}

// Update a user (manager only, or self for limited fields)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(request)
    const updates = await request.json()

    // Check if user exists
    const existingUser = await getUserById(params.id)
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check permissions
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If not a manager and not self, deny access
    if (session.role !== "manager" && session.userId !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If self but not manager, only allow updating certain fields
    if (session.role !== "manager" && session.userId === params.id) {
      // Filter allowed fields for self-update
      const allowedUpdates: Record<string, any> = {}

      if (updates.password) allowedUpdates.password = updates.password
      if (updates.email) allowedUpdates.email = updates.email

      // Update user with filtered updates
      const updatedUser = await updateUser(params.id, allowedUpdates)

      // Log the action
      await addAuditLogEntry({
        action: "update_user",
        user: session.username,
        source: "profile",
        details: `Updated own profile`,
      })

      // Don't send password back
      const { password, ...sanitizedUser } = updatedUser!

      return NextResponse.json({ user: sanitizedUser })
    }

    // Manager can update any field
    // Validate role if being updated
    if (updates.role && !["salesperson", "bdc", "manager"].includes(updates.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const updatedUser = await updateUser(params.id, updates)

    // Log the action
    await addAuditLogEntry({
      action: "update_user",
      user: session.username,
      source: "admin-dashboard",
      details: `Updated user: ${updatedUser!.name} (${updatedUser!.username})`,
    })

    // Don't send password back
    const { password, ...sanitizedUser } = updatedUser!

    return NextResponse.json({ user: sanitizedUser })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 })
  }
}

// Delete a user (manager only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(request)

    // Check if user is a manager
    if (!session || session.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get user before deletion for logging
    const user = await getUserById(params.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent deleting yourself
    if (user.id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete user
    const success = await deleteUser(params.id)

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log the action
    await addAuditLogEntry({
      action: "delete_user",
      user: session.username,
      source: "admin-dashboard",
      details: `Deleted user: ${user.name} (${user.username})`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
