"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LogIn, LogOut, Menu, Users, Bell, FileText, Monitor, Shield, UserPlus, Clock, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

interface NavigationProps {
  className?: string
}

interface AuthUser {
  id: string
  username: string
  name: string
  role: "salesperson" | "bdc" | "manager"
}

export function Navigation({ className }: NavigationProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check authentication status
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log("Navigation: Checking auth status...")

      // First try normal cookie-based auth
      let response = await fetch("/api/auth/check", {
        credentials: "include",
        cache: "no-store",
      })

      console.log("Navigation: Cookie auth response:", response.status)

      // If cookie auth failed, try with localStorage token
      if (!response.ok) {
        const storedToken = localStorage.getItem("auth-token")
        if (storedToken) {
          console.log("Navigation: Trying with stored token...")
          response = await fetch("/api/auth/check", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
            cache: "no-store",
          })
          console.log("Navigation: Token auth response:", response.status)
        }
      }

      if (response.ok) {
        const data = await response.json()
        console.log("Navigation: Auth successful:", data.user?.name, data.user?.role)
        setIsAuthenticated(true)
        setUser(data.user)
      } else {
        console.log("Navigation: Auth failed")
        setIsAuthenticated(false)
        setUser(null)
        // Clear stored token if it's invalid
        localStorage.removeItem("auth-token")
      }
    } catch (error) {
      console.error("Navigation: Auth check error:", error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      // Clear localStorage token
      localStorage.removeItem("auth-token")

      setIsAuthenticated(false)
      setUser(null)
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      {
        href: "/",
        label: "Main Display",
        icon: Monitor,
        description: "Live sales rotation display",
        roles: ["salesperson", "bdc", "manager"], // Available to all authenticated users
      },
    ]

    // Items for authenticated users only
    if (isAuthenticated && user) {
      // Profile is available to all authenticated users
      items.push({
        href: "/profile",
        label: "My Profile",
        icon: User,
        description: "Manage your account",
        roles: ["salesperson", "bdc", "manager"],
      })

      // Items for BDC and Manager only
      if (["bdc", "manager"].includes(user.role)) {
        items.push(
          {
            href: "/admin",
            label: "Admin Dashboard",
            icon: Users,
            description: "Manage employees and settings",
            roles: ["bdc", "manager"],
          },
          {
            href: "/admin#leads",
            label: "Lead Assignments",
            icon: UserPlus,
            description: "View lead assignment history",
            roles: ["bdc", "manager"],
          },
          {
            href: "/admin#notifications",
            label: "Notifications",
            icon: Bell,
            description: "Email alert settings",
            roles: ["bdc", "manager"],
          },
          {
            href: "/admin#audit",
            label: "Audit Log",
            icon: FileText,
            description: "System activity history",
            roles: ["bdc", "manager"],
          },
        )
      }

      // Items for Manager only
      if (user.role === "manager") {
        items.push({
          href: "/admin/users",
          label: "User Management",
          icon: Shield,
          description: "Manage system users",
          roles: ["manager"],
        })
      }
    }

    // Filter items based on user role
    return items.filter((item) => !user || item.roles.includes(user.role))
  }

  const navigationItems = getNavigationItems()
  const publicItems = navigationItems.filter((item) => !isAuthenticated || item.roles.includes("salesperson"))
  const adminItems = navigationItems.filter(
    (item) => isAuthenticated && user && ["bdc", "manager"].includes(user.role) && !item.roles.includes("salesperson"),
  )

  const isCurrentPage = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href.split("#")[0])
  }

  if (isLoading) {
    return (
      <nav className={`border-b bg-background shadow-sm ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`border-b bg-background shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative h-10 w-auto">
                <Image
                  src="/logos/header-logo-black-red.png"
                  alt="Downtown Nashville Nissan"
                  width={200}
                  height={40}
                  className="dark:hidden h-10 w-auto object-contain"
                  priority
                />
                <Image
                  src="/logos/header-logo-white-red.png"
                  alt="Downtown Nashville Nissan"
                  width={200}
                  height={40}
                  className="hidden dark:block h-10 w-auto object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Sales Up
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Main Navigation Items */}
            {publicItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isCurrentPage(item.href)
                      ? "bg-blue-100 text-blue-700 dark:bg-primary/20 dark:text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                  }`}
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Admin Dropdown - Only for BDC and Manager */}
            {isAuthenticated && user && ["bdc", "manager"].includes(user.role) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={pathname.startsWith("/admin") ? "default" : "ghost"}
                    className="flex items-center space-x-1"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <button
                          onClick={() => router.push(item.href)}
                          className="flex items-center space-x-2 w-full text-left"
                        >
                          <Icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                          </div>
                        </button>
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 text-red-600">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Status */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{user!.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="font-medium">{user!.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Role: <span className="capitalize">{user!.role}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => router.push("/profile")}
                      className="flex items-center space-x-2 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                  </DropdownMenuItem>
                  {user!.role === "salesperson" && (
                    <DropdownMenuItem asChild>
                      <button
                        onClick={() => router.push("/profile#availability")}
                        className="flex items-center space-x-2 w-full text-left"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Set Availability</span>
                      </button>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 text-red-600">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Login Button */}
            {!isAuthenticated && (
              <Button variant="outline" className="flex items-center space-x-1" onClick={() => router.push("/login")}>
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Brand */}
                  <div className="flex items-center space-x-2 pb-4 border-b">
                    <div className="relative h-8 w-auto">
                      <Image
                        src="/logos/header-logo-black-red.png"
                        alt="Downtown Nashville Nissan"
                        width={150}
                        height={32}
                        className="dark:hidden h-8 w-auto object-contain"
                        priority
                      />
                      <Image
                        src="/logos/header-logo-white-red.png"
                        alt="Downtown Nashville Nissan"
                        width={150}
                        height={32}
                        className="hidden dark:block h-8 w-auto object-contain"
                        priority
                      />
                    </div>
                  </div>

                  {/* User Info */}
                  {isAuthenticated && (
                    <div className="p-3 bg-blue-50 dark:bg-primary/20 rounded-lg">
                      <div className="font-medium text-blue-900 dark:text-primary">{user!.name}</div>
                      <div className="text-sm text-blue-700 dark:text-primary/80 capitalize">{user!.role}</div>
                    </div>
                  )}

                  {/* Navigation Items */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Navigation
                    </h3>
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors w-full text-left ${
                            isCurrentPage(item.href)
                              ? "bg-blue-100 text-blue-700 dark:bg-primary/20 dark:text-primary"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Authentication */}
                  <div className="pt-4 border-t">
                    {isAuthenticated ? (
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full flex items-center space-x-2"
                        onClick={() => router.push("/login")}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login</span>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
