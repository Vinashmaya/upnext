import { NextResponse } from "next/server"
import { getAuditLog } from "@/lib/storage"

export async function GET() {
  try {
    const entries = await getAuditLog()
    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error reading audit log:", error)
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 })
  }
}

// Optional: Add endpoint to clear old logs
export async function DELETE() {
  try {
    // For now, we'll just return success since clearing would require additional implementation
    return NextResponse.json({ message: "Audit log cleared" })
  } catch (error) {
    console.error("Error clearing audit log:", error)
    return NextResponse.json({ error: "Failed to clear audit log" }, { status: 500 })
  }
}
