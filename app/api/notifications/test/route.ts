import { NextResponse } from "next/server"
import { getNotificationSettings } from "@/lib/storage"

export async function POST() {
  try {
    // Read notification settings
    const settings = await getNotificationSettings()
    if (!settings) {
      return NextResponse.json({ error: "Notification settings not found" }, { status: 400 })
    }

    // Validate required settings
    if (!settings.adminEmail || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      return NextResponse.json({ error: "Email configuration incomplete" }, { status: 400 })
    }

    // In a real app, we would send an actual email here
    // For now, just return success to avoid nodemailer issues
    return NextResponse.json({
      success: true,
      message: "Test email would be sent (email sending disabled in preview)",
      config: {
        host: settings.smtpHost,
        port: settings.smtpPort,
        recipient: settings.adminEmail,
      },
    })
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ error: `Failed to send test email: ${error.message}` }, { status: 500 })
  }
}
