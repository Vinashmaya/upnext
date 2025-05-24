"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { Users, RotateCcw, Clock, Wifi, WifiOff, UserPlus, CheckCircle } from "lucide-react"

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

export default function MainDisplay() {
  const [systemState, setSystemState] = useState<SystemState | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leadName, setLeadName] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
        setIsOnline(true)
      } else {
        setIsOnline(false)
      }
    } catch (error) {
      console.error("Failed to fetch system state:", error)
      setIsOnline(false)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Real-time polling every 2 seconds (changed from 3 seconds)
  useEffect(() => {
    fetchSystemState()

    const interval = setInterval(() => {
      fetchSystemState()
    }, 2000) // More frequent updates

    return () => clearInterval(interval)
  }, [])

  const cycleToNext = async () => {
    try {
      const response = await fetch("/api/system-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cycle",
          source: "main-display",
        }),
      })

      if (response.ok) {
        fetchSystemState()
      }
    } catch (error) {
      console.error("Failed to cycle:", error)
    }
  }

  const assignLead = async () => {
    if (!leadName.trim() || !systemState) return

    setIsAssigning(true)
    try {
      // First, assign the lead
      const assignResponse = await fetch("/api/leads/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadName: leadName.trim(),
          employeeId: systemState.employees[systemState.currentUpIndex]?.id,
          employeeName: systemState.employees[systemState.currentUpIndex]?.name,
          source: "main-display",
        }),
      })

      if (assignResponse.ok) {
        // Then cycle to the next person
        const cycleResponse = await fetch("/api/system-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cycle",
            source: "main-display",
            context: "lead-assignment",
          }),
        })

        if (cycleResponse.ok) {
          fetchSystemState()
          setLeadName("")
          setIsModalOpen(false)
        }
      }
    } catch (error) {
      console.error("Failed to assign lead:", error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setLeadName("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && leadName.trim() && !isAssigning) {
      assignLead()
    }
  }

  const currentEmployee = systemState?.employees[systemState.currentUpIndex] || null
  const nextEmployee = systemState?.employees[(systemState.currentUpIndex + 1) % systemState.employees.length] || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 mt-8">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">Sales Team Up System</h1>
            <div className="flex items-center justify-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1">
                    <Wifi className="w-5 h-5 text-green-500" />
                    {isRefreshing && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                  </div>
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span>{isOnline ? "Connected" : "Offline"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Current Up Display */}
          <Card className="mb-8 border-4 border-green-500 shadow-2xl">
            <CardHeader className="bg-green-500 text-white text-center">
              <CardTitle className="text-3xl md:text-4xl font-bold">CURRENTLY UP</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              {currentEmployee ? (
                <div>
                  <div className="text-6xl md:text-8xl font-bold text-gray-800 mb-6">{currentEmployee.name}</div>

                  {/* Status and Action Section */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Badge variant="secondary" className="text-xl px-4 py-2">
                      <Users className="w-5 h-5 mr-2" />
                      Ready for leads
                    </Badge>

                    {/* Assign Lead Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="lg"
                          className="text-lg px-6 py-3 bg-blue-600 hover:bg-blue-700"
                          disabled={!currentEmployee.isActive}
                        >
                          <UserPlus className="w-5 h-5 mr-2" />
                          Assign Lead
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-xl">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                            Assign Lead to {currentEmployee.name}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                          {/* Current Employee Info */}
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-blue-900">Assigning to:</p>
                                <p className="text-lg font-bold text-blue-700">{currentEmployee.name}</p>
                              </div>
                            </div>
                          </div>

                          {/* Lead Name Input */}
                          <div className="space-y-2">
                            <Label htmlFor="lead-name" className="text-base font-medium">
                              Lead Full Name
                            </Label>
                            <Input
                              id="lead-name"
                              type="text"
                              placeholder="Enter the lead's full name"
                              value={leadName}
                              onChange={(e) => setLeadName(e.target.value)}
                              onKeyPress={handleKeyPress}
                              className="text-lg py-3"
                              autoFocus
                              disabled={isAssigning}
                            />
                            <p className="text-sm text-gray-600">
                              This will assign the lead and automatically cycle to the next person.
                            </p>
                          </div>

                          {/* Next Up Preview */}
                          {nextEmployee && (
                            <div className="bg-gray-50 p-3 rounded-lg border">
                              <p className="text-sm text-gray-600">Next up after assignment:</p>
                              <p className="font-semibold text-gray-800">{nextEmployee.name}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={assignLead}
                              disabled={!leadName.trim() || isAssigning}
                              className="flex-1 text-lg py-3"
                              size="lg"
                            >
                              {isAssigning ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Assigning...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5 mr-2" />
                                  Assign Lead & Cycle
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleModalClose}
                              disabled={isAssigning}
                              className="px-6"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Inactive Employee Notice */}
                  {!currentEmployee.isActive && (
                    <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-800 font-medium">
                        ⚠️ This employee is currently inactive. Lead assignment is disabled.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-4xl text-gray-500">No employees in queue</div>
              )}
            </CardContent>
          </Card>

          {/* Queue Display */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Current Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemState?.employees.map((employee, index) => (
                    <div
                      key={employee.id}
                      className={`p-4 rounded-lg border-2 ${
                        index === systemState.currentUpIndex
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          {index + 1}. {employee.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {index === systemState.currentUpIndex && <Badge className="bg-green-500">Current</Badge>}
                          {!employee.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                      </div>
                    </div>
                  )) || <div className="text-center py-4 text-gray-500">Loading...</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={cycleToNext}
                  className="w-full text-lg py-6"
                  size="lg"
                  disabled={!systemState || systemState.employees.length <= 1}
                  variant="outline"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Cycle to Next Person
                </Button>

                <div className="text-sm text-gray-600 text-center">
                  <p>Next up: {nextEmployee?.name || "End of queue"}</p>
                  {systemState && (
                    <p className="mt-2">
                      Total employees: {systemState.employees.length} | Active:{" "}
                      {systemState.employees.filter((emp) => emp.isActive).length}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
