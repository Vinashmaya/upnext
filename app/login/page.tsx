"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { Lock, User, AlertCircle, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()

  const testCredentials = async () => {
    try {
      const response = await fetch("/api/auth/debug")
      const data = await response.json()
      setDebugInfo(data)
      setShowDebug(true)
    } catch (error) {
      setDebugInfo({ error: "Failed to load debug info" })
      setShowDebug(true)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setDebugInfo(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Important for cookies
      })

      const data = await response.json()

      if (response.ok) {
        console.log("Login successful, redirecting...")
        router.push("/admin")
      } else {
        setError(data.error || "Invalid credentials")
        if (data.debug) {
          setDebugInfo(data.debug)
          setShowDebug(true)
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Login failed. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="flex items-center justify-center p-4 mt-16">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Lock className="w-6 h-6" />
                Admin Login
              </CardTitle>
              <p className="text-gray-600">Access the sales team management dashboard</p>
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Default Credentials:</strong>
                  <br />
                  Username: admin
                  <br />
                  Password: admin123
                </p>

                <div className="mt-3 text-center">
                  <Button onClick={testCredentials} variant="outline" size="sm" className="text-xs">
                    Test Credentials Setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Information */}
          {showDebug && debugInfo && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {debugInfo.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {debugInfo.success ? (
                    <>
                      <div>✅ Credentials loaded successfully</div>
                      <div>
                        Username: <code className="bg-white px-1 rounded">{debugInfo.username}</code>
                      </div>
                      <div>
                        Password set:{" "}
                        <code className="bg-white px-1 rounded">{debugInfo.passwordSet ? "Yes" : "No"}</code>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>❌ Error loading credentials</div>
                      <div className="text-red-600">{debugInfo.error}</div>
                    </>
                  )}

                  {debugInfo.providedUsername && (
                    <>
                      <hr className="my-2" />
                      <div>
                        Provided username: <code className="bg-white px-1 rounded">{debugInfo.providedUsername}</code>
                      </div>
                      <div>
                        Expected username: <code className="bg-white px-1 rounded">{debugInfo.expectedUsername}</code>
                      </div>
                      <div>
                        Password match:{" "}
                        <code className="bg-white px-1 rounded">{debugInfo.passwordMatch ? "Yes" : "No"}</code>
                      </div>
                    </>
                  )}
                </div>

                <Button onClick={() => setShowDebug(false)} variant="outline" size="sm" className="mt-3">
                  Hide Debug
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
