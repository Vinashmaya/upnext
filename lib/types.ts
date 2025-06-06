export interface User {
  id: string
  username: string
  password: string // In production, this should be hashed
  name: string
  role: "salesperson" | "bdc" | "manager"
  email?: string
  isActive: boolean
  temporaryInactiveUntil?: string // ISO date string when temporary inactivity ends
  createdAt: string
  lastLogin?: string
}

export interface Employee {
  id: string
  name: string
  isActive: boolean
  temporaryInactiveUntil?: string
}

export interface SystemState {
  employees: Employee[]
  currentUpIndex: number
  lastUpdated: string
}

export interface LeadAssignment {
  id: string
  leadName: string
  employeeId: string
  employeeName: string
  assignedAt: string
  assignedBy: string
  source: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  user: string
  source: string
  details: string
  beforeState?: any
  afterState?: any
}

export interface NotificationSettings {
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

export interface AuthSession {
  userId: string
  username: string
  role: "salesperson" | "bdc" | "manager"
  name: string
  issuedAt: string
  expiresAt: string
}
