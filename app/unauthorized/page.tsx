"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { ShieldAlert, Home, LogOut } from "lucide-react"

export default function UnauthorizedPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error("Auth check error:", error)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <Navigation />

      <div className="flex items-center justify-center p-4 mt-16">
        <div className="w-full max-w-md">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-700">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-gray-600">
                {user ? (
                  <>
                    Sorry, <span className="font-medium">{user.name}</span>, you don't have permission to access this
                    page. Your current role (<span className="font-medium">{user.role}</span>) doesn't have the required
                    privileges.
                  </>
                ) : (
                  <>
                    You don't have permission to access this page. Please log in with an account that has the required
                    privileges.
                  </>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push("/")} variant="outline" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go to Home
                </Button>

                <Button onClick={handleLogout} variant="destructive" className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
