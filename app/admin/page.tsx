"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Navigation } from "@/components/navigation"
import {
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  Settings,
  Save,
  RefreshCw,
  FileText,
  Clock,
  Mail,
  Bell,
  UserPlus,
  Download,
  Search,
  Database,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface Employee {
  id: string
  name: string
  isActive: boolean
}

interface SystemState {
  employees: Employee[]
  currentUpIndex: number
  lastUpdated: string
}

interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  user: string
  source: string
  details: string
  beforeState?: any
  afterState?: any
}

interface LeadAssignment {
  id: string
  leadName: string
  employeeId: string
  employeeName: string
  assignedAt: string
  assignedBy: string
  source: string
}

interface NotificationSettings {
  emailEnabled: boolean
  adminEmail: string
  notifyOnLogin: boolean
  notifyOnEmployeeRemoval: boolean
  notifyOnSystemChanges: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
}

interface StorageHealth {
  healthy: boolean
  message: string
  storage: {
    type: string
    location: string
  }
  timestamp: string
}

export default function AdminDashboard() {
  const [systemState, setSystemState] = useState<SystemState | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [leadAssignments, setLeadAssignments] = useState<LeadAssignment[]>([])
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null)
  const [newEmployeeName, setNewEmployeeName] = useState("")
  const [leadSearchTerm, setLeadSearchTerm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [testEmailSending, setTestEmailSending] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get initial tab from URL hash
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "")
      if (["management", "notifications", "leads", "audit", "system"].includes(hash)) {
        return hash
      }
    }
    return "management"
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${value}`)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (activeTab === "management") {
        fetchSystemState()
      } else if (activeTab === "leads") {
        fetchLeadAssignments()
      } else if (activeTab === "audit") {
        fetchAuditLog()
      } else if (activeTab === "system") {
        fetchStorageHealth()
      }
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, activeTab])

  // Update fetch functions to show refresh state
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
      }
    } catch (error) {
      console.error("Failed to fetch system state:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchAuditLog = async () => {
    try {
      const response = await fetch("/api/audit-log", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAuditLog(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error)
    }
  }

  const fetchLeadAssignments = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch("/api/leads/assign", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLeadAssignments(data.leads || [])
      }
    } catch (error) {
      console.error("Failed to fetch lead assignments:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch("/api/notifications/settings", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotificationSettings(data)
      }
    } catch (error) {
      console.error("Failed to fetch notification settings:", error)
    }
  }

  const fetchStorageHealth = async () => {
    try {
      const response = await fetch("/api/storage/health", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStorageHealth(data)
      }
    } catch (error) {
      console.error("Failed to fetch storage health:", error)
    }
  }

  useEffect(() => {
    fetchSystemState()
    fetchAuditLog()
    fetchLeadAssignments()
    fetchNotificationSettings()
    fetchStorageHealth()
  }, [])

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab())
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const saveSystemState = async (action: string, payload: any = {}) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/system-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          source: "admin-dashboard",
          ...payload,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSystemState(data)
        setLastSaved(new Date())
        // Refresh audit log after any change
        fetchAuditLog()
      }
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveNotificationSettings = async () => {
    if (!notificationSettings) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationSettings),
      })

      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const sendTestEmail = async () => {
    setTestEmailSending(true)
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        alert("Test email sent successfully!")
      } else {
        const data = await response.json()
        alert(`Failed to send test email: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to send test email")
    } finally {
      setTestEmailSending(false)
    }
  }

  const exportLeadAssignments = () => {
    if (leadAssignments.length === 0) {
      alert("No lead assignments to export")
      return
    }

    const csvContent = [
      ["Lead Name", "Assigned To", "Assigned At", "Assigned By", "Source"].join(","),
      ...leadAssignments.map((assignment) =>
        [
          `"${assignment.leadName}"`,
          `"${assignment.employeeName}"`,
          `"${new Date(assignment.assignedAt).toLocaleString()}"`,
          `"${assignment.assignedBy}"`,
          `"${assignment.source}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `lead-assignments-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addEmployee = async () => {
    if (newEmployeeName.trim()) {
      await saveSystemState("add", { name: newEmployeeName.trim() })
      setNewEmployeeName("")
    }
  }

  const removeEmployee = async (id: string) => {
    await saveSystemState("remove", { id })
  }

  const moveEmployee = async (index: number, direction: "up" | "down") => {
    if (!systemState) return

    const newEmployees = [...systemState.employees]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < newEmployees.length) {
      ;[newEmployees[index], newEmployees[targetIndex]] = [newEmployees[targetIndex], newEmployees[index]]
      await saveSystemState("reorder", {
        employees: newEmployees,
        details: `Moved ${newEmployees[targetIndex].name} ${direction}`,
      })
    }
  }

  const cycleUp = async () => {
    await saveSystemState("cycle")
  }

  const toggleEmployeeStatus = async (id: string) => {
    await saveSystemState("toggle", { id })
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "add":
        return "bg-green-100 text-green-800"
      case "remove":
        return "bg-red-100 text-red-800"
      case "cycle":
        return "bg-blue-100 text-blue-800"
      case "toggle":
        return "bg-yellow-100 text-yellow-800"
      case "reorder":
        return "bg-purple-100 text-purple-800"
      case "login":
        return "bg-indigo-100 text-indigo-800"
      case "login_failed":
        return "bg-red-100 text-red-800"
      case "lead_assignment":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter lead assignments based on search term
  const filteredLeadAssignments = leadAssignments.filter(
    (assignment) =>
      assignment.leadName.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
      assignment.employeeName.toLowerCase().includes(leadSearchTerm.toLowerCase()),
  )

  // Calculate lead assignment statistics
  const leadStats = {
    total: leadAssignments.length,
    today: leadAssignments.filter((assignment) => {
      const assignedDate = new Date(assignment.assignedAt).toDateString()
      const today = new Date().toDateString()
      return assignedDate === today
    }).length,
    thisWeek: leadAssignments.filter((assignment) => {
      const assignedDate = new Date(assignment.assignedAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return assignedDate >= weekAgo
    }).length,
  }

  const currentEmployee = systemState?.employees[systemState.currentUpIndex] || null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between mt-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your sales team rotation</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh
                  {isRefreshing && <div className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-1" />}
                </Label>
              </div>
              <Button
                onClick={() => {
                  fetchSystemState()
                  fetchAuditLog()
                  fetchLeadAssignments()
                  fetchNotificationSettings()
                  fetchStorageHealth()
                }}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {lastSaved && <div className="text-sm text-gray-600">Last saved: {lastSaved.toLocaleTimeString()}</div>}
            </div>
          </div>

          {/* Current Status */}
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Currently Up:</p>
                  <p className="text-2xl font-bold text-blue-600">{currentEmployee?.name || "No one in queue"}</p>
                </div>
                <Button
                  onClick={cycleUp}
                  className="flex items-center gap-2"
                  disabled={isSaving || !systemState || systemState.employees.length <= 1}
                >
                  <RotateCcw className="w-4 h-4" />
                  {isSaving ? "Cycling..." : "Cycle Up"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Employee Management
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Lead Assignments
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                System Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="management" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Add Employee */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add New Employee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Employee name"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addEmployee()}
                        disabled={isSaving}
                      />
                      <Button onClick={addEmployee} disabled={isSaving || !newEmployeeName.trim()}>
                        {isSaving ? <Save className="w-4 h-4" /> : "Add"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Queue Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Queue Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {systemState?.employees.filter((emp) => emp.isActive).length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{systemState?.employees.length || 0}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Employee List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Employee Queue ({systemState?.employees.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {systemState?.employees.map((employee, index) => (
                      <div
                        key={employee.id}
                        className={`p-4 border rounded-lg ${
                          index === systemState.currentUpIndex ? "border-green-500 bg-green-50" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg">{index + 1}.</span>
                            <span className="text-lg">{employee.name}</span>
                            {index === systemState.currentUpIndex && <Badge className="bg-green-500">Current Up</Badge>}
                            <Badge
                              variant={employee.isActive ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => toggleEmployeeStatus(employee.id)}
                            >
                              {employee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveEmployee(index, "up")}
                              disabled={index === 0 || isSaving}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveEmployee(index, "down")}
                              disabled={index === (systemState?.employees.length || 0) - 1 || isSaving}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEmployee(employee.id)}
                              disabled={isSaving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        {systemState === null ? "Loading..." : "No employees in the system. Add some to get started!"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leads" className="space-y-6">
              {/* Lead Assignment Statistics */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Total Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{leadStats.total}</div>
                    <p className="text-sm text-gray-600">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{leadStats.today}</div>
                    <p className="text-sm text-gray-600">Leads assigned today</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">{leadStats.thisWeek}</div>
                    <p className="text-sm text-gray-600">Last 7 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lead Assignment Log */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Lead Assignment Log ({filteredLeadAssignments.length} entries)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button onClick={exportLeadAssignments} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by lead name or employee..."
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <div className="space-y-3">
                      {filteredLeadAssignments.length > 0 ? (
                        filteredLeadAssignments.map((assignment) => (
                          <div key={assignment.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <UserPlus className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-lg text-gray-900">{assignment.leadName}</div>
                                  <div className="text-sm text-gray-600">
                                    Assigned to{" "}
                                    <span className="font-medium text-blue-600">{assignment.employeeName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  {formatTimestamp(assignment.assignedAt)}
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  {assignment.source}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 mt-3 pt-3 border-t">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium">Assigned by:</span> {assignment.assignedBy}
                                </div>
                                <div>
                                  <span className="font-medium">Assignment ID:</span> {assignment.id}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : leadAssignments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No lead assignments yet</p>
                          <p className="text-sm">
                            Lead assignments will appear here when they are made from the main display.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No assignments match your search</p>
                          <p className="text-sm">Try adjusting your search terms.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Notification Settings
                  </CardTitle>
                  <p className="text-sm text-gray-600">Configure email alerts for critical system events</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notificationSettings && (
                    <>
                      {/* Enable/Disable Notifications */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-enabled" className="text-base font-medium">
                            Enable Email Notifications
                          </Label>
                          <p className="text-sm text-gray-600">Send email alerts for critical system events</p>
                        </div>
                        <Switch
                          id="email-enabled"
                          checked={notificationSettings.emailEnabled}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, emailEnabled: checked })
                          }
                        />
                      </div>

                      {notificationSettings.emailEnabled && (
                        <>
                          {/* Admin Email */}
                          <div className="space-y-2">
                            <Label htmlFor="admin-email">Admin Email Address</Label>
                            <Input
                              id="admin-email"
                              type="email"
                              placeholder="admin@company.com"
                              value={notificationSettings.adminEmail}
                              onChange={(e) =>
                                setNotificationSettings({ ...notificationSettings, adminEmail: e.target.value })
                              }
                            />
                          </div>

                          {/* Notification Types */}
                          <div className="space-y-4">
                            <Label className="text-base font-medium">Notification Types</Label>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="notify-login">Login Attempts</Label>
                                  <p className="text-sm text-gray-600">Alert on successful and failed login attempts</p>
                                </div>
                                <Switch
                                  id="notify-login"
                                  checked={notificationSettings.notifyOnLogin}
                                  onCheckedChange={(checked) =>
                                    setNotificationSettings({ ...notificationSettings, notifyOnLogin: checked })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="notify-removal">Employee Removals</Label>
                                  <p className="text-sm text-gray-600">
                                    Alert when employees are removed from the system
                                  </p>
                                </div>
                                <Switch
                                  id="notify-removal"
                                  checked={notificationSettings.notifyOnEmployeeRemoval}
                                  onCheckedChange={(checked) =>
                                    setNotificationSettings({
                                      ...notificationSettings,
                                      notifyOnEmployeeRemoval: checked,
                                    })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="notify-changes">System Changes & Lead Assignments</Label>
                                  <p className="text-sm text-gray-600">Alert on system changes and lead assignments</p>
                                </div>
                                <Switch
                                  id="notify-changes"
                                  checked={notificationSettings.notifyOnSystemChanges}
                                  onCheckedChange={(checked) =>
                                    setNotificationSettings({ ...notificationSettings, notifyOnSystemChanges: checked })
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* SMTP Settings */}
                          <div className="space-y-4">
                            <Label className="text-base font-medium">SMTP Configuration</Label>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="smtp-host">SMTP Host</Label>
                                <Input
                                  id="smtp-host"
                                  placeholder="smtp.gmail.com"
                                  value={notificationSettings.smtpHost}
                                  onChange={(e) =>
                                    setNotificationSettings({ ...notificationSettings, smtpHost: e.target.value })
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="smtp-port">SMTP Port</Label>
                                <Input
                                  id="smtp-port"
                                  type="number"
                                  placeholder="587"
                                  value={notificationSettings.smtpPort}
                                  onChange={(e) =>
                                    setNotificationSettings({
                                      ...notificationSettings,
                                      smtpPort: Number.parseInt(e.target.value) || 587,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="smtp-user">SMTP Username</Label>
                              <Input
                                id="smtp-user"
                                placeholder="your-email@gmail.com"
                                value={notificationSettings.smtpUser}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, smtpUser: e.target.value })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="smtp-password">SMTP Password</Label>
                              <Input
                                id="smtp-password"
                                type="password"
                                placeholder="App password or SMTP password"
                                value={notificationSettings.smtpPassword}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, smtpPassword: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          {/* Test Email */}
                          <div className="flex items-center gap-4 pt-4 border-t">
                            <Button onClick={sendTestEmail} disabled={testEmailSending} variant="outline">
                              <Mail className="w-4 h-4 mr-2" />
                              {testEmailSending ? "Sending..." : "Send Test Email"}
                            </Button>
                            <p className="text-sm text-gray-600">Test your email configuration</p>
                          </div>
                        </>
                      )}

                      {/* Save Settings */}
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={saveNotificationSettings} disabled={isSaving}>
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    System Audit Log ({auditLog.length} entries)
                  </CardTitle>
                  <p className="text-sm text-gray-600">Complete history of all system changes</p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <div className="space-y-3">
                      {auditLog.length > 0 ? (
                        auditLog.map((entry) => (
                          <div key={entry.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getActionColor(entry.action)}>{entry.action.toUpperCase()}</Badge>
                                <span className="font-medium">{entry.details}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {formatTimestamp(entry.timestamp)}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                User: <span className="font-medium">{entry.user}</span>
                              </div>
                              <div>
                                Source: <span className="font-medium">{entry.source}</span>
                              </div>

                              {entry.beforeState && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                    View Details
                                  </summary>
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    <div className="mb-2">
                                      <strong>Before:</strong>
                                      <pre className="mt-1 whitespace-pre-wrap">
                                        {JSON.stringify(entry.beforeState, null, 2)}
                                      </pre>
                                    </div>
                                    {entry.afterState && (
                                      <div>
                                        <strong>After:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap">
                                          {JSON.stringify(entry.afterState, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No audit log entries found. Actions will be logged here.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              {/* Storage Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Storage System Status
                  </CardTitle>
                  <p className="text-sm text-gray-600">Monitor the health and status of your data storage</p>
                </CardHeader>
                <CardContent>
                  {storageHealth ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {storageHealth.healthy ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {storageHealth.healthy ? "Storage Healthy" : "Storage Issues Detected"}
                          </div>
                          <div className="text-sm text-gray-600">{storageHealth.message}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label className="text-sm font-medium">Storage Type</Label>
                          <div className="text-lg font-semibold">{storageHealth.storage.type}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Location</Label>
                          <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                            {storageHealth.storage.location}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium">Last Health Check</Label>
                        <div className="text-sm text-gray-600">{formatTimestamp(storageHealth.timestamp)}</div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button onClick={fetchStorageHealth} variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Run Health Check
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Loading storage status...</div>
                  )}
                </CardContent>
              </Card>

              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Environment</Label>
                      <div className="text-lg">{process.env.NODE_ENV || "development"}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Platform</Label>
                      <div className="text-lg">Vercel Serverless</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Data Persistence</Label>
                      <div className="text-lg">File System</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Auto-refresh</Label>
                      <div className="text-lg">{autoRefresh ? "Enabled" : "Disabled"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
