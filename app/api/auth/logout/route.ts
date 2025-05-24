import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit-log.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Write audit log entry for logout
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

export async function POST() {
  try {
    // Log the logout
    await writeAuditLogEntry({
      action: "logout",
      user: "admin",
      source: "navigation",
      details: "Admin logged out",
    })

    const response = NextResponse.json({ success: true })

    // Clear the session cookie
    response.cookies.set("admin-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
