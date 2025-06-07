import { NextResponse } from "next/server"
import { getNotificationSettings } from "@/lib/storage"

// Check if action should trigger notification
function shouldNotifyForAction(action: string, settings: any): boolean {
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

export async function POST(request: Request) {
  try {
    const { action, details, user, timestamp } = await request.json()

    // Read notification settings
    const settings = await getNotificationSettings()
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

    // In a real app, we would send an actual email here
    // For now, just return success to avoid nodemailer issues
    return NextResponse.json({
      success: true,
      message: "Notification would be sent (email sending disabled in preview)",
      notification: {
        action,
        details,
        user,
        timestamp,
        recipient: settings.adminEmail,
      },
    })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
