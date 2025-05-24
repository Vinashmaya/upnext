"use client"

import { useState, useEffect, useRef } from "react"

interface SystemState {
  employees: any[]
  currentUpIndex: number
  lastUpdated: string
}

interface UseRealTimeUpdatesOptions {
  enabled?: boolean
  fallbackInterval?: number
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const { enabled = true, fallbackInterval = 3000 } = options
  const [systemState, setSystemState] = useState<SystemState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fallback fetch function
  const fetchSystemState = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch("/api/system-state", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSystemState(data)
        setLastUpdated(new Date())
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error("Failed to fetch system state:", error)
      setIsConnected(false)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Set up real-time connection
  useEffect(() => {
    if (!enabled) return

    // Try to establish SSE connection
    const connectSSE = () => {
      try {
        const eventSource = new EventSource("/api/system-state/stream")
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          console.log("Real-time connection established")
          setIsConnected(true)
          // Clear fallback interval if SSE is working
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current)
            fallbackIntervalRef.current = null
          }
        }

        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            if (message.type === "system-state-update") {
              setSystemState(message.data)
              setLastUpdated(new Date())
              setIsRefreshing(false)
            } else if (message.type === "heartbeat") {
              // Keep connection alive
              setIsConnected(true)
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error)
          }
        }

        eventSource.onerror = (error) => {
          console.log("SSE connection error, falling back to polling")
          setIsConnected(false)
          eventSource.close()

          // Fall back to polling
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(fetchSystemState, fallbackInterval)
          }
        }
      } catch (error) {
        console.log("SSE not supported, using polling")
        // Fall back to polling immediately
        if (!fallbackIntervalRef.current) {
          fallbackIntervalRef.current = setInterval(fetchSystemState, fallbackInterval)
        }
      }
    }

    // Initial fetch
    fetchSystemState()

    // Try to connect with SSE after initial fetch
    setTimeout(connectSSE, 1000)

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
  }, [enabled, fallbackInterval])

  // Manual refresh function
  const refresh = () => {
    fetchSystemState()
  }

  return {
    systemState,
    isConnected,
    lastUpdated,
    isRefreshing,
    refresh,
  }
}
