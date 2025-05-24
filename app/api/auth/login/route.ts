import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface AdminCredentials {
  username: string
  password: string
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
const ADMIN_FILE = path.join(DATA_DIR, "admin.json")
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit-log.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read admin credentials from file
async function readAdminCredentials(): Promise<AdminCredentials> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(ADMIN_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, create default credentials
    const defaultCredentials: AdminCredentials = {
      username: "admin",
      password: "admin123", // In production, this should be hashed
    }

    await fs.writeFile(ADMIN_FILE, JSON.stringify(defaultCredentials, null, 2))
    return defaultCredentials
  }
}

// Write audit log entry for authentication events
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

// Send email notification for login events
async function sendLoginNotification(action: string, user: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        details: action === "login" ? "Successful admin login" : "Failed login attempt",
        user,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error("Failed to send login notification:", error)
    // Don't throw error to prevent blocking the login process
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    const adminCredentials = await readAdminCredentials()

    if (username === adminCredentials.username && password === adminCredentials.password) {
      // Log successful login
      await writeAuditLogEntry({
        action: "login",
        user: username,
        source: "login-page",
        details: "Successful admin login",
      })

      // Send notification email for successful login
      await sendLoginNotification("login", username)

      const response = NextResponse.json({ success: true })
      response.cookies.set("admin-session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
      })
      return response
    } else {
      // Log failed login attempt
      await writeAuditLogEntry({
        action: "login_failed",
        user: username || "unknown",
        source: "login-page",
        details: "Failed login attempt",
      })

      // Send notification email for failed login
      await sendLoginNotification("login_failed", username || "unknown")

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
