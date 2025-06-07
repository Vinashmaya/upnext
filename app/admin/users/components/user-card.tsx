"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { User, Mail, Calendar, Shield, MoreVertical, Edit, Trash2, UserCheck, UserX, Clock } from "lucide-react"

interface UserType {
  id: string
  username: string
  name: string
  role: "salesperson" | "bdc" | "manager"
  email?: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
  temporaryInactiveUntil?: string
}

interface UserCardProps {
  user: UserType
  currentUserId?: string
  onEdit: (user: UserType) => void
  onDelete: (userId: string) => void
  onToggleStatus: (userId: string) => void
}

export function UserCard({ user, currentUserId, onEdit, onDelete, onToggleStatus }: UserCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "bdc":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "salesperson":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleToggleStatus = async () => {
    setIsLoading(true)
    try {
      await onToggleStatus(user.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      setIsLoading(true)
      try {
        await onDelete(user.id)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const isCurrentUser = user.id === currentUserId
  const isTemporarilyInactive = user.temporaryInactiveUntil && new Date(user.temporaryInactiveUntil) > new Date()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">@{user.username}</p>

              <div className="flex items-center gap-2 mb-3">
                <Badge className={getRoleBadgeColor(user.role)}>{user.role.toUpperCase()}</Badge>
                <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                {isTemporarilyInactive && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    <Clock className="w-3 h-3 mr-1" />
                    Temp Inactive
                  </Badge>
                )}
              </div>

              {user.email && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isLoading}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleToggleStatus}>
                {user.isActive ? (
                  <>
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isCurrentUser}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 pt-4 border-t text-sm text-gray-500">
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

          {isTemporarilyInactive && (
            <div className="mt-2 text-yellow-600">
              <Clock className="w-3 h-3 inline mr-1" />
              Inactive until: {new Date(user.temporaryInactiveUntil!).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
