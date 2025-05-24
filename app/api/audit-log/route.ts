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

// Read audit log from file
async function readAuditLog(): Promise<{ entries: AuditLogEntry[] }> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(AUDIT_LOG_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, create empty log
    const emptyLog = { entries: [] }
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(emptyLog, null, 2))
    return emptyLog
  }
}

export async function GET() {
  try {
    const auditLog = await readAuditLog()
    return NextResponse.json(auditLog)
  } catch (error) {
    console.error("Error reading audit log:", error)
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 })
  }
}

// Optional: Add endpoint to clear old logs or export logs
export async function DELETE() {
  try {
    const emptyLog = { entries: [] }
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(emptyLog, null, 2))
    return NextResponse.json({ message: "Audit log cleared" })
  } catch (error) {
    console.error("Error clearing audit log:", error)
    return NextResponse.json({ error: "Failed to clear audit log" }, { status: 500 })
  }
}
