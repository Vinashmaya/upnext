"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Save, X } from "lucide-react"

interface UserFormData {
  username: string
  password: string
  name: string
  role: "salesperson" | "bdc" | "manager"
  email: string
  isActive: boolean
}

interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  title: string
  submitText: string
  isEdit?: boolean
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  title,
  submitText,
  isEdit = false,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: initialData?.username || "",
    password: "",
    name: initialData?.name || "",
    role: initialData?.role || "salesperson",
    email: initialData?.email || "",
    isActive: initialData?.isActive !== false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!isEdit && !formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  const updateField = (field: keyof UserFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="Enter username"
              disabled={isLoading}
              className={errors.username ? "border-red-500" : ""}
            />
            {errors.username && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-3 h-3" />
                {errors.username}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password {isEdit ? "(leave blank to keep current)" : "*"}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder={isEdit ? "Enter new password" : "Enter password"}
              disabled={isLoading}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter full name"
              disabled={isLoading}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => updateField("role", e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="salesperson">Salesperson</option>
              <option value="bdc">BDC</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Enter email address"
              disabled={isLoading}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active User</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateField("isActive", checked)}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : submitText}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
