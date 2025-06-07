import { Redis } from "@upstash/redis"

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

interface NotificationSettings {
  emailEnabled: boolean
  adminEmail: string
  notifyOnLogin: boolean
  notifyOnEmployeeRemoval: boolean
  notifyOnSystemChanges: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
}

// Initialize Redis client
const redis = Redis.fromEnv()

// System State Management
export async function getSystemState(): Promise<SystemState> {
  try {
    const state = await redis.get<SystemState>("system-state")

    if (!state) {
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

      await redis.set("system-state", defaultState)
      return defaultState
    }

    return state
  } catch (error) {
    console.error("Error getting system state:", error)
    throw new Error(`Failed to get system state: ${error.message}`)
  }
}

export async function setSystemState(state: SystemState): Promise<void> {
  try {
    state.lastUpdated = new Date().toISOString()
    await redis.set("system-state", state)
  } catch (error) {
    console.error("Error setting system state:", error)
    throw new Error(`Failed to set system state: ${error.message}`)
  }
}

// Lead Assignments Management
export async function getLeadAssignments(): Promise<LeadAssignment[]> {
  try {
    const assignments = await redis.get<LeadAssignment[]>("lead-assignments")
    return assignments || []
  } catch (error) {
    console.error("Error getting lead assignments:", error)
    return []
  }
}

export async function addLeadAssignment(assignment: LeadAssignment): Promise<void> {
  try {
    const assignments = await getLeadAssignments()
    assignments.unshift(assignment)

    // Keep only last 1000 assignments
    if (assignments.length > 1000) {
      assignments.splice(1000)
    }

    await redis.set("lead-assignments", assignments)
  } catch (error) {
    console.error("Error adding lead assignment:", error)
    throw new Error(`Failed to add lead assignment: ${error.message}`)
  }
}

// Audit Log Management
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const log = await redis.get<AuditLogEntry[]>("audit-log")
    return log || []
  } catch (error) {
    console.error("Error getting audit log:", error)
    return []
  }
}

export async function addAuditLogEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
  try {
    const log = await getAuditLog()
    const newEntry: AuditLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry,
    }

    log.unshift(newEntry)

    // Keep only last 1000 entries
    if (log.length > 1000) {
      log.splice(1000)
    }

    await redis.set("audit-log", log)
  } catch (error) {
    console.error("Error adding audit log entry:", error)
    // Don't throw here to prevent blocking main operations
  }
}

// Notification Settings Management
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settings = await redis.get<NotificationSettings>("notification-settings")

    if (!settings) {
      const defaultSettings: NotificationSettings = {
        emailEnabled: false,
        adminEmail: "",
        notifyOnLogin: true,
        notifyOnEmployeeRemoval: true,
        notifyOnSystemChanges: true,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
      }

      await redis.set("notification-settings", defaultSettings)
      return defaultSettings
    }

    return settings
  } catch (error) {
    console.error("Error getting notification settings:", error)
    throw new Error(`Failed to get notification settings: ${error.message}`)
  }
}

export async function setNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await redis.set("notification-settings", settings)
  } catch (error) {
    console.error("Error setting notification settings:", error)
    throw new Error(`Failed to set notification settings: ${error.message}`)
  }
}

// Admin Credentials Management
export async function getAdminCredentials(): Promise<{ username: string; password: string }> {
  try {
    const credentials = await redis.get<{ username: string; password: string }>("admin-credentials")

    if (!credentials) {
      const defaultCredentials = {
        username: "admin",
        password: "admin123",
      }

      await redis.set("admin-credentials", defaultCredentials)
      return defaultCredentials
    }

    return credentials
  } catch (error) {
    console.error("Error getting admin credentials:", error)
    throw new Error(`Failed to get admin credentials: ${error.message}`)
  }
}

// Utility function to get storage info
export function getStorageInfo(): { type: string; location: string } {
  return {
    type: "Upstash Redis",
    location: process.env.KV_REST_API_URL || "Redis Cloud",
  }
}

// Health check function
export async function checkStorageHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    // Test Redis connection
    const testKey = `health-check-${Date.now()}`
    const testData = { timestamp: new Date().toISOString(), test: true }

    // Test write
    await redis.set(testKey, testData, { ex: 60 }) // Expire in 60 seconds

    // Test read
    const readData = await redis.get(testKey)

    // Clean up
    await redis.del(testKey)

    if (readData && readData.test === true) {
      return {
        healthy: true,
        message: "Redis storage is working correctly",
      }
    } else {
      return {
        healthy: false,
        message: "Redis read/write test failed",
      }
    }
  } catch (error) {
    return {
      healthy: false,
      message: `Redis error: ${error.message}`,
    }
  }
}

// Test Redis connection
export async function testRedisConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
  try {
    const result = await redis.ping()
    return {
      connected: true,
      message: "Redis connection successful",
      details: { ping: result },
    }
  } catch (error) {
    return {
      connected: false,
      message: `Redis connection failed: ${error.message}`,
      details: { error: error.message },
    }
  }
}
