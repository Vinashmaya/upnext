import { NextResponse } from "next/server"
import { setUserTemporaryInactive, getSessionFromCookies, addAuditLogEntry, getUserById } from "@/lib/storage"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookies()
    const { minutes } = await request.json()

    // Validate minutes
    if (!minutes || ![30, 60, 90].includes(minutes)) {
      return NextResponse.json({ error: "Invalid minutes value. Must be 30, 60, or 90." }, { status: 400 })
    }

    // Check permissions
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get user to check role
    const user = await getUserById(params.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is authorized to set temporary inactivity
    // Self (if salesperson) or BDC/Manager can set temporary inactivity
    const isSelf = session.userId === params.id
    const isBDCOrManager = ["bdc", "manager"].includes(session.role)

    if (!(isSelf && user.role === "salesperson") && !isBDCOrManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Set temporary inactivity
    const updatedUser = await setUserTemporaryInactive(params.id, minutes)

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate when the user will be active again
    const activeAgainAt = new Date(updatedUser.temporaryInactiveUntil!)

    // Log the action
    await addAuditLogEntry({
      action: "temporary_inactive",
      user: session.username,
      source: isSelf ? "self-action" : "admin-dashboard",
      details: `${updatedUser.name} set to inactive for ${minutes} minutes (until ${activeAgainAt.toLocaleTimeString()})`,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        isActive: false,
        temporaryInactiveUntil: updatedUser.temporaryInactiveUntil,
        activeAgainAt: activeAgainAt.toLocaleTimeString(),
      },
    })
  } catch (error) {
    console.error("Error setting temporary inactivity:", error)
    return NextResponse.json({ error: "Failed to set temporary inactivity" }, { status: 500 })
  }
}
