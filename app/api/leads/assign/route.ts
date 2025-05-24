import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface LeadAssignment {
  id: string
  leadName: string
  employeeId: string
  employeeName: string
  assignedAt: string
  assignedBy: string
  source: string
}

interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  user: string
  source: string
  details: string
  beforeState?: any
  afterState?: any
}

const DATA_DIR = path.join(process.cwd(), "data")
const LEADS_FILE = path.join(DATA_DIR, "lead-assignments.json")
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit-log.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read lead assignments from file
async function readLeadAssignments(): Promise<LeadAssignment[]> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(LEADS_FILE, "utf-8")
    const assignments = JSON.parse(data)
    return assignments.leads || []
  } catch (error) {
    // If file doesn't exist, create empty assignments
    const emptyAssignments = { leads: [] }
    await fs.writeFile(LEADS_FILE, JSON.stringify(emptyAssignments, null, 2))
    return []
  }
}

// Write lead assignments to file
async function writeLeadAssignments(assignments: LeadAssignment[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(LEADS_FILE, JSON.stringify({ leads: assignments }, null, 2))
}

// Write audit log entry
async function writeAuditLogEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(AUDIT_LOG_FILE, "utf-8")
    const log = JSON.parse(data)
    const entries = log.entries || []

    const newEntry: AuditLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry,
    }

    entries.unshift(newEntry) // Add to beginning for newest first

    // Keep only last 1000 entries
    if (entries.length > 1000) {
      entries.splice(1000)
    }

    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify({ entries }, null, 2))
  } catch (error) {
    // If audit log doesn't exist, create it
    const newLog = {
      entries: [
        {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ...entry,
        },
      ],
    }
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(newLog, null, 2))
  }
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

    // Read existing assignments
    const assignments = await readLeadAssignments()

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
    assignments.unshift(newAssignment) // Add to beginning for newest first

    // Keep only last 1000 assignments to prevent file from growing too large
    if (assignments.length > 1000) {
      assignments.splice(1000)
    }

    // Save assignments
    await writeLeadAssignments(assignments)

    // Log the assignment
    await writeAuditLogEntry({
      action: "lead_assignment",
      user: "system",
      source: source || "unknown",
      details: `Assigned lead "${leadName}" to ${employeeName}`,
      beforeState: { leadCount: assignments.length - 1 },
      afterState: {
        leadCount: assignments.length,
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
    const assignments = await readLeadAssignments()
    return NextResponse.json({ leads: assignments })
  } catch (error) {
    console.error("Error reading lead assignments:", error)
    return NextResponse.json({ error: "Failed to read lead assignments" }, { status: 500 })
  }
}
