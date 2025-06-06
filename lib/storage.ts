import { Redis } from "@upstash/redis"
import type { User, SystemState, LeadAssignment, AuditLogEntry, NotificationSettings, AuthSession } from "./types"
import { jwtVerify, SignJWT } from "jose"

// Initialize Redis client
const redis = Redis.fromEnv()

// Secret key for JWT - make sure it's properly encoded
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_change_this_in_production_make_it_longer_than_32_chars"
  return new TextEncoder().encode(secret)
}

// Initialize Redis with default data if needed
async function initializeRedisData() {
  try {
    console.log("Initializing Redis data structures...")

    // Check if users exist
    const users = await redis.get<User[]>("users")
    if (!users) {
      console.log("Creating empty users array")
      await redis.set("users", [])
    }

    // Check if system state exists
    const systemState = await redis.get<SystemState>("system-state")
    if (!systemState) {
      console.log("Creating default system state")
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
    }

    // Check if lead assignments exist
    const leadAssignments = await redis.get<LeadAssignment[]>("lead-assignments")
    if (!leadAssignments) {
      console.log("Creating empty lead assignments array")
      await redis.set("lead-assignments", [])
    }

    // Check if audit log exists
    const auditLog = await redis.get<AuditLogEntry[]>("audit-log")
    if (!auditLog) {
      console.log("Creating empty audit log array")
      await redis.set("audit-log", [])
    }

    // Check if notification settings exist
    const notificationSettings = await redis.get<NotificationSettings>("notification-settings")
    if (!notificationSettings) {
      console.log("Creating default notification settings")
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
    }

    console.log("Redis data structures initialized successfully")
    return true
  } catch (error) {
    console.error("Error initializing Redis data:", error)
    return false
  }
}

// User Management functions (keeping existing ones)
export async function getUsers(): Promise<User[]> {
  try {
    const users = await redis.get<User[]>("users")
    return users || []
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const users = await getUsers()
    return users.find((user) => user.id === id) || null
  } catch (error) {
    console.error("Error getting user by ID:", error)
    return null
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const users = await getUsers()
    return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null
  } catch (error) {
    console.error("Error getting user by username:", error)
    return null
  }
}

export async function createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
  try {
    const users = await getUsers()

    // Check if username already exists
    if (users.some((u) => u.username.toLowerCase() === user.username.toLowerCase())) {
      throw new Error("Username already exists")
    }

    // Validate required fields
    if (!user.username || !user.password || !user.name || !user.role) {
      throw new Error("Missing required fields")
    }

    // Validate role
    if (!["salesperson", "bdc", "manager"].includes(user.role)) {
      throw new Error("Invalid role")
    }

    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      username: user.username.toLowerCase(), // Store usernames in lowercase for consistency
    }

    users.push(newUser)
    await redis.set("users", users)

    return newUser
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const users = await getUsers()
    const index = users.findIndex((user) => user.id === id)

    if (index === -1) {
      return null
    }

    // If updating username, check if it already exists
    if (updates.username && updates.username !== users[index].username) {
      if (users.some((u) => u.username === updates.username)) {
        throw new Error("Username already exists")
      }
    }

    users[index] = { ...users[index], ...updates }
    await redis.set("users", users)

    return users[index]
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const users = await getUsers()
    const filteredUsers = users.filter((user) => user.id !== id)

    if (filteredUsers.length === users.length) {
      return false // User not found
    }

    await redis.set("users", filteredUsers)
    return true
  } catch (error) {
    console.error("Error deleting user:", error)
    throw error
  }
}

export async function updateUserLastLogin(id: string): Promise<void> {
  try {
    const users = await getUsers()
    const index = users.findIndex((user) => user.id === id)

    if (index !== -1) {
      users[index].lastLogin = new Date().toISOString()
      await redis.set("users", users)
    }
  } catch (error) {
    console.error("Error updating user last login:", error)
  }
}

export async function setUserTemporaryInactive(id: string, minutes: number): Promise<User | null> {
  try {
    const users = await getUsers()
    const index = users.findIndex((user) => user.id === id)

    if (index === -1) {
      return null
    }

    const inactiveUntil = new Date()
    inactiveUntil.setMinutes(inactiveUntil.getMinutes() + minutes)

    users[index].temporaryInactiveUntil = inactiveUntil.toISOString()
    await redis.set("users", users)

    // Also update in the system state if the user is in the rotation
    const systemState = await getSystemState()
    const employeeIndex = systemState.employees.findIndex((emp) => emp.id === id)

    if (employeeIndex !== -1) {
      systemState.employees[employeeIndex].temporaryInactiveUntil = inactiveUntil.toISOString()
      systemState.employees[employeeIndex].isActive = false
      await setSystemState(systemState)
    }

    return users[index]
  } catch (error) {
    console.error("Error setting user temporary inactive:", error)
    throw error
  }
}

// Authentication - Fixed JWT handling
export async function createSession(user: User): Promise<string> {
  try {
    console.log("Creating session for user:", user.username)

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session

    const session: AuthSession = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    console.log("Session data:", session)

    // Create JWT token with proper secret
    const JWT_SECRET = getJWTSecret()
    const token = await new SignJWT({ ...session })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(JWT_SECRET)

    console.log("JWT token created successfully")

    // Update last login time
    await updateUserLastLogin(user.id)

    // If user is a salesperson, add them to the rotation if not already there
    if (user.role === "salesperson" && user.isActive) {
      await addUserToRotation(user)
    }

    return token
  } catch (error) {
    console.error("Error creating session:", error)
    throw new Error(`Failed to create session: ${error.message}`)
  }
}

export async function verifySession(token: string): Promise<AuthSession | null> {
  try {
    console.log("Verifying session token...")

    if (!token || token.trim() === "") {
      console.log("Empty token provided")
      return null
    }

    const JWT_SECRET = getJWTSecret()
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const session = payload as unknown as AuthSession

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      console.log("Session expired")
      return null
    }

    console.log("Session verified successfully for:", session.username)
    return session
  } catch (error) {
    console.error("Error verifying session:", error)
    return null
  }
}

// Helper function to get session from cookies (for API routes)
export async function getSessionFromCookies(): Promise<AuthSession | null> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    return await verifySession(token)
  } catch (error) {
    console.error("Error getting session from cookies:", error)
    return null
  }
}

// Helper function to add a user to the rotation
async function addUserToRotation(user: User): Promise<void> {
  try {
    const systemState = await getSystemState()

    // Check if user is already in the rotation
    const existingIndex = systemState.employees.findIndex((emp) => emp.id === user.id)

    if (existingIndex === -1) {
      // Add user to rotation
      systemState.employees.push({
        id: user.id,
        name: user.name,
        isActive: true,
        temporaryInactiveUntil: user.temporaryInactiveUntil,
      })

      await setSystemState(systemState)

      // Log the action
      await addAuditLogEntry({
        action: "add",
        user: user.username,
        source: "login",
        details: `${user.name} added to rotation on login`,
      })
    } else if (!systemState.employees[existingIndex].isActive && !user.temporaryInactiveUntil) {
      // Reactivate user in rotation if they were inactive
      systemState.employees[existingIndex].isActive = true
      systemState.employees[existingIndex].temporaryInactiveUntil = undefined

      await setSystemState(systemState)

      // Log the action
      await addAuditLogEntry({
        action: "toggle",
        user: user.username,
        source: "login",
        details: `${user.name} reactivated in rotation on login`,
      })
    }
  } catch (error) {
    console.error("Error adding user to rotation:", error)
  }
}

// Initialize default users if none exist
export async function initializeDefaultUsers(): Promise<void> {
  try {
    console.log("Checking for default users...")

    // First ensure Redis data structures are initialized
    await initializeRedisData()

    const users = await getUsers()

    if (users.length === 0) {
      console.log("Creating default users...")
      const defaultUsers: Omit<User, "id" | "createdAt">[] = [
        {
          username: "manager",
          password: "manager123", // In production, use hashed passwords
          name: "System Manager",
          role: "manager",
          email: "manager@example.com",
          isActive: true,
        },
        {
          username: "bdc",
          password: "bdc123",
          name: "BDC Agent",
          role: "bdc",
          isActive: true,
        },
        {
          username: "sales1",
          password: "sales123",
          name: "John Smith",
          role: "salesperson",
          isActive: true,
        },
        {
          username: "sales2",
          password: "sales123",
          name: "Sarah Johnson",
          role: "salesperson",
          isActive: true,
        },
      ]

      for (const user of defaultUsers) {
        await createUser(user)
      }

      console.log("Default users created successfully")
    } else {
      console.log(`Found ${users.length} existing users`)
    }
  } catch (error) {
    console.error("Error initializing default users:", error)
  }
}

// System State Management (keeping existing functions)
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

    // Check for any temporary inactive users that should be reactivated
    const now = new Date()
    let updated = false

    for (const employee of state.employees) {
      if (employee.temporaryInactiveUntil && new Date(employee.temporaryInactiveUntil) <= now) {
        employee.isActive = true
        employee.temporaryInactiveUntil = undefined
        updated = true
      }
    }

    if (updated) {
      await setSystemState(state)
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

// Lead Assignments Management (keeping existing functions)
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

// Audit Log Management (keeping existing functions)
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

// Notification Settings Management (keeping existing functions)
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
