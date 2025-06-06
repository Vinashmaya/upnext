"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { ClientOnly } from "@/components/client-only"
import { Lock, User, AlertCircle, Info } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [debugInfo, setDebugInfo] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect")

  // Handle mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize system and check if already logged in
  useEffect(() => {
    if (!mounted) return

    async function initAndCheckAuth() {
      try {
        // Initialize system with timeout
        console.log("Initializing system...")
        const initPromise = fetch("/api/init", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        const initTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Init timeout")), 10000))

        await Promise.race([initPromise, initTimeout])
        console.log("System initialized")

        // Check if already logged in with timeout
        console.log("Checking existing auth...")

        // Try multiple auth check methods
        let authResponse = null

        // First try with cookies
        try {
          authResponse = await fetch("/api/auth/check", {
            credentials: "include",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          })
        } catch (e) {
          console.log("Cookie auth failed:", e)
        }

        // If cookie auth failed, try with localStorage token
        if (!authResponse || !authResponse.ok) {
          const storedToken = localStorage.getItem("auth-token")
          if (storedToken) {
            try {
              authResponse = await fetch("/api/auth/check", {
                headers: {
                  Authorization: `Bearer ${storedToken}`,
                  "Cache-Control": "no-cache",
                },
              })
            } catch (e) {
              console.log("Token auth failed:", e)
            }
          }
        }

        if (authResponse && authResponse.ok) {
          const data = await authResponse.json()
          console.log("Already logged in as:", data.user?.name)
          // Already logged in, redirect to main page or requested page
          if (redirect) {
            router.push(decodeURIComponent(redirect))
          } else {
            router.push("/")
          }
          return
        }
      } catch (error) {
        console.error("Initialization or auth check error:", error)
        // Continue to login page even if there's an error
      } finally {
        console.log("Initialization complete")
        setIsInitializing(false)
      }
    }

    initAndCheckAuth()
  }, [mounted, router, redirect])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setDebugInfo("")

    try {
      console.log("Attempting login for:", username)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Important for cookies
      })

      const data = await response.json()
      console.log("Login response:", { status: response.status, success: data.success })

      if (response.ok && data.success) {
        console.log("Login successful for:", data.user?.name)

        // Store token in localStorage as fallback
        if (data.token) {
          localStorage.setItem("auth-token", data.token)
          console.log("Token stored in localStorage")
        }

        // Wait a moment for cookie to be set
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Verify the login worked
        try {
          const verifyResponse = await fetch("/api/auth/check", {
            credentials: "include",
          })

          if (verifyResponse.ok) {
            console.log("Login verification successful")
          } else {
            console.log("Login verification failed, but continuing anyway")
          }
        } catch (verifyError) {
          console.log("Login verification error:", verifyError)
        }

        // Redirect to main page or the original requested URL
        if (redirect) {
          router.push(decodeURIComponent(redirect))
        } else {
          router.push("/")
        }
      } else {
        setError(data.error || "Invalid credentials")
        console.log("Login failed:", data.error)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Login failed. Please try again.")
    }

    setIsLoading(false)
  }

  const handleDebugAuth = async () => {
    try {
      const response = await fetch("/api/auth/debug", {
        credentials: "include",
      })
      const data = await response.json()
      setDebugInfo(JSON.stringify(data, null, 2))
      console.log("Debug auth info:", data)
    } catch (error) {
      setDebugInfo(`Debug failed: ${error.message}`)
    }
  }

  const handleSkipToLogin = () => {
    console.log("Skipping initialization, going to login form")
    setIsInitializing(false)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Initializing system...</p>
          <Button onClick={handleSkipToLogin} variant="outline" size="sm">
            Skip to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />

        <div className="flex items-center justify-center p-4 mt-16">
          <div className="w-full max-w-md space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Lock className="w-6 h-6" />
                  Login
                </CardTitle>
                <p className="text-gray-600">Sign in to access the sales team system</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {debugInfo && (
                    <div className="flex items-start gap-2 text-blue-600 text-xs">
                      <Info className="w-4 h-4 mt-0.5" />
                      <pre className="whitespace-pre-wrap">{debugInfo}</pre>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <Button type="button" onClick={handleDebugAuth} variant="outline" className="w-full" size="sm">
                    Debug Auth Status
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    <strong>Default Credentials:</strong>
                    <br />
                    <span className="font-medium">Manager:</span> username: manager / password: manager123
                    <br />
                    <span className="font-medium">BDC:</span> username: bdc / password: bdc123
                    <br />
                    <span className="font-medium">Salesperson:</span> username: sales1 / password: sales123
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientOnly>
  )
}
