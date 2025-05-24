import { NextResponse } from "next/server"
import { getNotificationSettings, setNotificationSettings } from "@/lib/storage"

export async function GET() {
  try {
    const settings = await getNotificationSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error reading notification settings:", error)
    return NextResponse.json({ error: "Failed to read notification settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json()
    await setNotificationSettings(settings)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving notification settings:", error)
    return NextResponse.json({ error: "Failed to save notification settings" }, { status: 500 })
  }
}
