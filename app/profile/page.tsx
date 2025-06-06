"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { User, Clock, Save, AlertCircle, CheckCircle } from "lucide-react"

interface AuthUser {
  id: string
  username: string
  name: string
  role: "salesperson" | "bdc" | "manager"
  email?: string
  isActive: boolean
  lastLogin?: string
  temporaryInactiveUntil?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  const checkAuthAndLoadProfile = async () => {
    try {
      // Check authentication
      let response = await fetch("/api/auth/check", {
        credentials: "include",
      })

      // Try with localStorage token if cookie auth failed
      if (!response.ok) {
        const storedToken = localStorage.getItem("auth-token")
        if (storedToken) {
          response = await fetch("/api/auth/check", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          })
        }
      }

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          email: data.user.email || "",
          password: "",
          confirmPassword: "",
        })
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate passwords if provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const updates: any = {}

      if (formData.email !== user.email) {
        updates.email = formData.email
      }

      if (formData.password) {
        updates.password = formData.password
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          ...formData,
          password: "",
          confirmPassword: "",
        })
        setMessage({ type: "success", text: "Profile updated successfully" })
      } else {
        const error = await response.json()
        setMessage({ type: "error", text: error.error || "Failed to update profile" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update profile" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetTemporaryInactive = async (minutes: number) => {
    if (!user) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/users/${user.id}/temporary-inactive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ minutes }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({
          type: "success",
          text: `You will be inactive until ${data.user.activeAgainAt}`,
        })
        // Refresh user data
        checkAuthAndLoadProfile()
      } else {
        const error = await response.json()
        setMessage({ type: "error", text: error.error || "Failed to set temporary inactivity" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to set temporary inactivity" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center p-4 mt-16">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center p-4 mt-16">
          <Card>
            <CardContent className="p-6 text-center">
              <p>Please log in to view your profile.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 mt-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <div className="text-lg font-semibold">{user.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Username</Label>
                    <div className="text-lg font-semibold">{user.username}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Role</Label>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {user.lastLogin && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                    <div className="text-sm text-gray-700">{new Date(user.lastLogin).toLocaleString()}</div>
                  </div>
                )}

                {user.temporaryInactiveUntil && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Temporarily Inactive</span>
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                      Active again at: {new Date(user.temporaryInactiveUntil).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Update Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Update Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  {formData.password && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm your new password"
                      />
                    </div>
                  )}

                  {message && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        message.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {message.type === "success" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{message.text}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={isSaving} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Availability Settings - Only for Salesperson */}
            {user.role === "salesperson" && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Availability Settings
                  </CardTitle>
                  <p className="text-sm text-gray-600">Set yourself as temporarily inactive if you need to step away</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => handleSetTemporaryInactive(30)} disabled={isSaving} variant="outline">
                      Inactive for 30 minutes
                    </Button>
                    <Button onClick={() => handleSetTemporaryInactive(60)} disabled={isSaving} variant="outline">
                      Inactive for 1 hour
                    </Button>
                    <Button onClick={() => handleSetTemporaryInactive(90)} disabled={isSaving} variant="outline">
                      Inactive for 1.5 hours
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    This will temporarily remove you from the sales rotation. You'll be automatically reactivated after
                    the selected time.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
