import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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

const DATA_DIR = path.join(process.cwd(), "data")
const NOTIFICATION_SETTINGS_FILE = path.join(DATA_DIR, "notification-settings.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read notification settings from file
async function readNotificationSettings(): Promise<NotificationSettings> {
  await ensureDataDir()

  try {
    const data = await fs.readFile(NOTIFICATION_SETTINGS_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, create default settings
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

    await writeNotificationSettings(defaultSettings)
    return defaultSettings
  }
}

// Write notification settings to file
async function writeNotificationSettings(settings: NotificationSettings): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(NOTIFICATION_SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export async function GET() {
  try {
    const settings = await readNotificationSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error reading notification settings:", error)
    return NextResponse.json({ error: "Failed to read notification settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const settings: NotificationSettings = await request.json()
    await writeNotificationSettings(settings)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving notification settings:", error)
    return NextResponse.json({ error: "Failed to save notification settings" }, { status: 500 })
  }
}
