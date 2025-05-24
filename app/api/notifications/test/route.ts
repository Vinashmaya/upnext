import { NextResponse } from "next/server"
import { getNotificationSettings } from "@/lib/storage"
import nodemailer from "nodemailer"

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

    // Test email content
    const testEmailHtml = `
      <h2>🧪 Sales Up System - Test Email</h2>
      <p>This is a test email to verify your notification settings are working correctly.</p>
      <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Configuration Details:</h3>
      <ul>
        <li><strong>SMTP Host:</strong> ${settings.smtpHost}</li>
        <li><strong>SMTP Port:</strong> ${settings.smtpPort}</li>
        <li><strong>SMTP User:</strong> ${settings.smtpUser}</li>
        <li><strong>Admin Email:</strong> ${settings.adminEmail}</li>
      </ul>

      <h3>Notification Settings:</h3>
      <ul>
        <li><strong>Login Notifications:</strong> ${settings.notifyOnLogin ? "✅ Enabled" : "❌ Disabled"}</li>
        <li><strong>Employee Removal Notifications:</strong> ${settings.notifyOnEmployeeRemoval ? "✅ Enabled" : "❌ Disabled"}</li>
        <li><strong>System Change Notifications:</strong> ${settings.notifyOnSystemChanges ? "✅ Enabled" : "❌ Disabled"}</li>
      </ul>

      <p style="color: green;"><strong>✅ Success!</strong> If you received this email, your notification system is working correctly.</p>
      <hr>
      <p><em>This is a test email from your Sales Up System.</em></p>
    `

    // Send test email
    await transporter.sendMail({
      from: `"Sales Up System" <${settings.smtpUser}>`,
      to: settings.adminEmail,
      subject: "🧪 Sales Up System - Test Email Configuration",
      html: testEmailHtml,
    })

    return NextResponse.json({ success: true, message: "Test email sent successfully" })
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ error: `Failed to send test email: ${error.message}` }, { status: 500 })
  }
}
