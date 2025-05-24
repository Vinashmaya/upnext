import { NextResponse } from "next/server"
import { addLeadAssignment, getLeadAssignments, addAuditLogEntry } from "@/lib/storage"

interface LeadAssignment {
  id: string
  leadName: string
  employeeId: string
  employeeName: string
  assignedAt: string
  assignedBy: string
  source: string
}

// Send email notification for lead assignment
async function sendLeadAssignmentNotification(leadName: string, employeeName: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "lead_assignment",
        details: `Lead "${leadName}" assigned to ${employeeName}`,
        user: "system",
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error("Failed to send lead assignment notification:", error)
    // Don't throw error to prevent blocking the main operation
  }
}

export async function POST(request: Request) {
  try {
    const { leadName, employeeId, employeeName, source } = await request.json()

    // Validate required fields
    if (!leadName || !employeeId || !employeeName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create new assignment
    const newAssignment: LeadAssignment = {
      id: Date.now().toString(),
      leadName: leadName.trim(),
      employeeId,
      employeeName,
      assignedAt: new Date().toISOString(),
      assignedBy: "system", // In a real app, get this from session/JWT
      source: source || "unknown",
    }

    // Add to assignments
    await addLeadAssignment(newAssignment)

    // Log the assignment
    await addAuditLogEntry({
      action: "lead_assignment",
      user: "system",
      source: source || "unknown",
      details: `Assigned lead "${leadName}" to ${employeeName}`,
      beforeState: { leadCount: "unknown" },
      afterState: {
        assignment: {
          leadName,
          employeeName,
          assignedAt: newAssignment.assignedAt,
        },
      },
    })

    // Send notification email
    await sendLeadAssignmentNotification(leadName, employeeName)

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message: `Lead "${leadName}" successfully assigned to ${employeeName}`,
    })
  } catch (error) {
    console.error("Error assigning lead:", error)
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const assignments = await getLeadAssignments()
    return NextResponse.json({ leads: assignments })
  } catch (error) {
    console.error("Error reading lead assignments:", error)
    return NextResponse.json({ error: "Failed to read lead assignments" }, { status: 500 })
  }
}
