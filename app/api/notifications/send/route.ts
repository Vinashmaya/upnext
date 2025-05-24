import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import nodemailer from "nodemailer"

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

// Read notification settings from file
async function readNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const data = await fs.readFile(NOTIFICATION_SETTINGS_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

// Check if action should trigger notification
function shouldNotifyForAction(action: string, settings: NotificationSettings): boolean {
  switch (action) {
    case "login":
    case "login_failed":
      return settings.notifyOnLogin
    case "remove":
      return settings.notifyOnEmployeeRemoval
    case "add":
    case "reorder":
    case "toggle":
    case "lead_assignment":
      return settings.notifyOnSystemChanges
    default:
      return false
  }
}

// Get email subject and body based on action
function getEmailContent(action: string, details: string, user: string, timestamp: string) {
  const formattedTime = new Date(timestamp).toLocaleString()

  switch (action) {
    case "login":
      return {
        subject: "🔐 Sales Up System - Admin Login",
        html: `
          <h2>Admin Login Notification</h2>
          <p><strong>User:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Status:</strong> Successful login</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    case "login_failed":
      return {
        subject: "🚨 Sales Up System - Failed Login Attempt",
        html: `
          <h2>Failed Login Attempt</h2>
          <p><strong>User:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Status:</strong> Login failed</p>
          <p style="color: red;"><strong>⚠️ Security Alert:</strong> Someone attempted to access the admin panel with invalid credentials.</p>
          <hr>
          <p><em>This is an automated security notification from your Sales Up System.</em></p>
        `,
      }

    case "remove":
      return {
        subject: "🗑️ Sales Up System - Employee Removed",
        html: `
          <h2>Employee Removal Alert</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Performed by:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p style="color: orange;"><strong>⚠️ Critical Action:</strong> An employee has been removed from the sales rotation system.</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    case "add":
      return {
        subject: "➕ Sales Up System - New Employee Added",
        html: `
          <h2>New Employee Added</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Performed by:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    case "reorder":
      return {
        subject: "🔄 Sales Up System - Queue Reordered",
        html: `
          <h2>Employee Queue Reordered</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Performed by:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    case "toggle":
      return {
        subject: "🔄 Sales Up System - Employee Status Changed",
        html: `
          <h2>Employee Status Changed</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Performed by:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    case "lead_assignment":
      return {
        subject: "👤 Sales Up System - Lead Assigned",
        html: `
          <h2>Lead Assignment Notification</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p style="color: green;"><strong>✅ Lead Assigned:</strong> A new lead has been assigned to a sales team member.</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }

    default:
      return {
        subject: "📋 Sales Up System - System Activity",
        html: `
          <h2>System Activity Notification</h2>
          <p><strong>Action:</strong> ${details}</p>
          <p><strong>Performed by:</strong> ${user}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <hr>
          <p><em>This is an automated notification from your Sales Up System.</em></p>
        `,
      }
  }
}

export async function POST(request: Request) {
  try {
    const { action, details, user, timestamp } = await request.json()

    // Read notification settings
    const settings = await readNotificationSettings()
    if (!settings || !settings.emailEnabled) {
      return NextResponse.json({ message: "Email notifications disabled" })
    }

    // Check if this action should trigger a notification
    if (!shouldNotifyForAction(action, settings)) {
      return NextResponse.json({ message: "Notification not configured for this action" })
    }

    // Validate required settings
    if (!settings.adminEmail || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      return NextResponse.json({ error: "Email configuration incomplete" }, { status: 400 })
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    })

    // Get email content
    const { subject, html } = getEmailContent(action, details, user, timestamp)

    // Send email
    await transporter.sendMail({
      from: `"Sales Up System" <${settings.smtpUser}>`,
      to: settings.adminEmail,
      subject,
      html,
    })

    return NextResponse.json({ success: true, message: "Notification sent" })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
