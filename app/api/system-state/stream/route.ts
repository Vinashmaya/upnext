import type { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface SystemState {
  employees: any[]
  currentUpIndex: number
  lastUpdated: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const SYSTEM_STATE_FILE = path.join(DATA_DIR, "system-state.json")

// Read system state from file
async function readSystemState(): Promise<SystemState> {
  try {
    const data = await fs.readFile(SYSTEM_STATE_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // Return default state if file doesn't exist
    return {
      employees: [],
      currentUpIndex: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let lastModified = ""

      const sendUpdate = async () => {
        try {
          const stats = await fs.stat(SYSTEM_STATE_FILE)
          const currentModified = stats.mtime.toISOString()

          // Only send update if file has been modified
          if (currentModified !== lastModified) {
            lastModified = currentModified
            const systemState = await readSystemState()

            const data = `data: ${JSON.stringify({
              type: "system-state-update",
              data: systemState,
              timestamp: new Date().toISOString(),
            })}\n\n`

            controller.enqueue(encoder.encode(data))
          }
        } catch (error) {
          console.error("Error reading system state:", error)
        }
      }

      // Send initial state
      sendUpdate()

      // Set up polling every 1 second
      const interval = setInterval(sendUpdate, 1000)

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        const data = `data: ${JSON.stringify({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(data))
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
