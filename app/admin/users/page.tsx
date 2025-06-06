"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Navigation } from "@/components/navigation"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Shield,
  User,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
} from "lucide-react"

interface UserType {
  id: string
  username: string
  name: string
  role: "salesperson" | "bdc" | "manager"
  email?: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

interface AuthUser {
  id: string
  username: string
  name: string
  role: "salesperson" | "bdc" | "manager"
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "salesperson" as "salesperson" | "bdc" | "manager",
    email: "",
    isActive: true,
  })
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadUsers()
  }, [])

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add token from localStorage if available
    const storedToken = localStorage.getItem("auth-token")
    if (storedToken) {
      headers["Authorization"] = `Bearer ${storedToken}`
    }

    return headers
  }

  const checkAuthAndLoadUsers = async () => {
    try {
      // Check authentication
      const response = await fetch("/api/auth/check", {
        credentials: "include",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const authData = await response.json()
        setCurrentUser(authData.user)

        // Check if user is a manager
        if (authData.user.role !== "manager") {
          console.log("User is not a manager:", authData.user.role)
          router.push("/unauthorized")
          return
        }

        // Load users
        await loadUsers()
      } else {
        console.log("Auth check failed:", response.status)
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users", {
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        const error = await response.json()
        console.error("Failed to load users:", error)
        setMessage({ type: "error", text: error.error || "Failed to load users" })
      }
    } catch (error) {
      console.error("Error loading users:", error)
      setMessage({ type: "error", text: "Failed to load users" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        await loadUsers()
        setIsCreateModalOpen(false)
        resetForm()
        setMessage({ type: "success", text: "User created successfully" })
      } else {
        console.error("Failed to create user:", data)
        setMessage({ type: "error", text: data.error || "Failed to create user" })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      setMessage({ type: "error", text: "Failed to create user" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        await loadUsers()
        setEditingUser(null)
        resetForm()
        setMessage({ type: "success", text: "User updated successfully" })
      } else {
        console.error("Failed to update user:", data)
        setMessage({ type: "error", text: data.error || "Failed to update user" })
      }
    } catch (error) {
      console.error("Error updating user:", error)
      setMessage({ type: "error", text: "Failed to update user" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (response.ok) {
        await loadUsers()
        setMessage({ type: "success", text: "User deleted successfully" })
      } else {
        const error = await response.json()
        console.error("Failed to delete user:", error)
        setMessage({ type: "error", text: error.error || "Failed to delete user" })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      setMessage({ type: "error", text: "Failed to delete user" })
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      role: "salesperson",
      email: "",
      isActive: true,
    })
  }

  const openEditModal = (user: UserType) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "", // Don't pre-fill password
      name: user.name,
      role: user.role,
      email: user.email || "",
      isActive: user.isActive,
    })
  }

  const closeEditModal = () => {
    setEditingUser(null)
    resetForm()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager":
        return "bg-purple-100 text-purple-800"
      case "bdc":
        return "bg-blue-100 text-blue-800"
      case "salesperson":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between mt-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
              <p className="text-gray-600">Manage system users and their permissions</p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="salesperson">Salesperson</option>
                      <option value="bdc">BDC</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <Label htmlFor="isActive">Active User</Label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Creating..." : "Create User"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateModalOpen(false)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {message && (
            <div
              className={`mb-6 flex items-center gap-2 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Search and Refresh */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                System Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-4">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{user.name}</div>
                              <div className="text-sm text-gray-600">@{user.username}</div>
                              {user.email && (
                                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge className={getRoleBadgeColor(user.role)}>{user.role.toUpperCase()}</Badge>
                              <div className="mt-1">
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            {user.lastLogin && (
                              <div className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Last login: {new Date(user.lastLogin).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No users match your search" : "No users found"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Edit User Modal */}
          {editingUser && (
            <Dialog open={!!editingUser} onOpenChange={() => closeEditModal()}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Username</Label>
                    <Input
                      id="edit-username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <select
                      id="edit-role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="salesperson">Salesperson</option>
                      <option value="bdc">BDC</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <Label htmlFor="edit-isActive">Active User</Label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Updating..." : "Update User"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeEditModal}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
