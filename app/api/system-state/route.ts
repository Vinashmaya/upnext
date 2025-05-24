import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface Employee {
  id: string
  name: string
  isActive: boolean
}

interface SystemState {
  employees: Employee[]
  currentUpIndex: number
  lastUpdated: string
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
const SYSTEM_STATE_FILE = path.join(DATA_DIR, "system-state.json")
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit-log.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read system state from file
async function readSystemState(): Promise<SystemState> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(SYSTEM_STATE_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, create default state
    const defaultState: SystemState = {
      employees: [
        { id: "1", name: "John Smith", isActive: true },
        { id: "2", name: "Sarah Johnson", isActive: true },
        { id: "3", name: "Mike Davis", isActive: true },
        { id: "4", name: "Emily Brown", isActive: true },
      ],
      currentUpIndex: 0,
      lastUpdated: new Date().toISOString(),
    }

    await writeSystemState(defaultState)
    return defaultState
  }
}

// Write system state to file
async function writeSystemState(state: SystemState): Promise<void> {
  await ensureDataDir()
  state.lastUpdated = new Date().toISOString()
  await fs.writeFile(SYSTEM_STATE_FILE, JSON.stringify(state, null, 2))
}

// Read audit log from file
async function readAuditLog(): Promise<AuditLogEntry[]> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(AUDIT_LOG_FILE, "utf-8")
    const log = JSON.parse(data)
    return log.entries || []
  } catch (error) {
    // If file doesn't exist, create empty log
    const emptyLog = { entries: [] }
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(emptyLog, null, 2))
    return []
  }
}

// Write audit log entry
async function writeAuditLogEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
  await ensureDataDir()

  const entries = await readAuditLog()
  const newEntry: AuditLogEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry,
  }

  entries.unshift(newEntry) // Add to beginning for newest first

  // Keep only last 1000 entries to prevent file from growing too large
  if (entries.length > 1000) {
    entries.splice(1000)
  }

  await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify({ entries }, null, 2))
}

// Send email notification for critical actions
async function sendNotificationEmail(action: string, details: string, user: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        details,
        user,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error("Failed to send notification email:", error)
    // Don't throw error to prevent blocking the main operation
  }
}

export async function GET() {
  try {
    const systemState = await readSystemState()
    return NextResponse.json(systemState)
  } catch (error) {
    console.error("Error reading system state:", error)
    return NextResponse.json({ error: "Failed to read system state" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const beforeState = await readSystemState()
    const systemState = { ...beforeState }

    const user = "admin" // In a real app, get this from session/JWT
    const source = body.source || "unknown"
    let details = ""
    let beforeStateForLog: any = null
    let afterStateForLog: any = null
    let shouldNotify = false

    switch (body.action) {
      case "add":
        const newEmployee: Employee = {
          id: Date.now().toString(),
          name: body.name,
          isActive: true,
        }
        systemState.employees.push(newEmployee)
        details = `Added employee: ${body.name}`
        beforeStateForLog = { employeeCount: beforeState.employees.length }
        afterStateForLog = { employeeCount: systemState.employees.length, addedEmployee: newEmployee }
        shouldNotify = true
        break

      case "remove":
        const employeeToRemove = systemState.employees.find((emp) => emp.id === body.id)
        systemState.employees = systemState.employees.filter((emp) => emp.id !== body.id)
        if (systemState.currentUpIndex >= systemState.employees.length) {
          systemState.currentUpIndex = 0
        }
        details = `Removed employee: ${employeeToRemove?.name || "Unknown"}`
        beforeStateForLog = { employeeCount: beforeState.employees.length, removedEmployee: employeeToRemove }
        afterStateForLog = { employeeCount: systemState.employees.length }
        shouldNotify = true // Critical action - always notify
        break

      case "cycle":
        const previousEmployee = systemState.employees[systemState.currentUpIndex]
        if (systemState.employees.length > 0) {
          systemState.currentUpIndex = (systemState.currentUpIndex + 1) % systemState.employees.length
        }
        const newCurrentEmployee = systemState.employees[systemState.currentUpIndex]
        details = `Cycled from ${previousEmployee?.name || "None"} to ${newCurrentEmployee?.name || "None"}`
        beforeStateForLog = { currentUp: previousEmployee?.name, currentUpIndex: beforeState.currentUpIndex }
        afterStateForLog = { currentUp: newCurrentEmployee?.name, currentUpIndex: systemState.currentUpIndex }
        break

      case "reorder":
        const oldOrder = systemState.employees.map((emp) => emp.name)
        systemState.employees = body.employees
        systemState.currentUpIndex = 0
        const newOrder = systemState.employees.map((emp) => emp.name)
        details = body.details || `Reordered employee queue`
        beforeStateForLog = { order: oldOrder }
        afterStateForLog = { order: newOrder }
        shouldNotify = true
        break

      case "toggle":
        const employeeToToggle = systemState.employees.find((emp) => emp.id === body.id)
        systemState.employees = systemState.employees.map((emp) =>
          emp.id === body.id ? { ...emp, isActive: !emp.isActive } : emp,
        )
        const toggledEmployee = systemState.employees.find((emp) => emp.id === body.id)
        details = `${toggledEmployee?.isActive ? "Activated" : "Deactivated"} employee: ${employeeToToggle?.name}`
        beforeStateForLog = {
          employee: employeeToToggle?.name,
          status: employeeToToggle?.isActive ? "active" : "inactive",
        }
        afterStateForLog = {
          employee: toggledEmployee?.name,
          status: toggledEmployee?.isActive ? "active" : "inactive",
        }
        shouldNotify = true
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await writeSystemState(systemState)

    // Log the action
    await writeAuditLogEntry({
      action: body.action,
      user,
      source,
      details,
      beforeState: beforeStateForLog,
      afterState: afterStateForLog,
    })

    // Send notification email for critical actions
    if (shouldNotify) {
      await sendNotificationEmail(body.action, details, user)
    }

    return NextResponse.json(systemState)
  } catch (error) {
    console.error("Error updating system state:", error)
    return NextResponse.json({ error: "Failed to update system state" }, { status: 500 })
  }
}
