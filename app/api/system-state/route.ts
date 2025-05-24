import { NextResponse } from "next/server"
import { getSystemState, setSystemState, addAuditLogEntry } from "@/lib/storage"

interface Employee {
  id: string
  name: string
  isActive: boolean
}

export async function GET() {
  try {
    const systemState = await getSystemState()
    return NextResponse.json(systemState)
  } catch (error) {
    console.error("Error reading system state:", error)
    return NextResponse.json(
      {
        error: "Failed to read system state",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const beforeState = await getSystemState()
    const systemState = { ...beforeState }

    const user = "admin"
    const source = body.source || "unknown"
    let details = ""
    let beforeStateForLog: any = null
    let afterStateForLog: any = null

    switch (body.action) {
      case "add":
        const newEmployee: Employee = {
          id: Date.now().toString(),
          name: body.name,
          isActive: true,
        }
        systemState.employees.push(newEmployee)
        details = `Added employee: ${body.name}`
        beforeStateForLog = { employeeCount: beforeState.employees.length }
        afterStateForLog = { employeeCount: systemState.employees.length, addedEmployee: newEmployee }
        break

      case "remove":
        const employeeToRemove = systemState.employees.find((emp) => emp.id === body.id)
        systemState.employees = systemState.employees.filter((emp) => emp.id !== body.id)
        if (systemState.currentUpIndex >= systemState.employees.length) {
          systemState.currentUpIndex = 0
        }
        details = `Removed employee: ${employeeToRemove?.name || "Unknown"}`
        beforeStateForLog = { employeeCount: beforeState.employees.length, removedEmployee: employeeToRemove }
        afterStateForLog = { employeeCount: systemState.employees.length }
        break

      case "cycle":
        const previousEmployee = systemState.employees[systemState.currentUpIndex]
        if (systemState.employees.length > 0) {
          systemState.currentUpIndex = (systemState.currentUpIndex + 1) % systemState.employees.length
        }
        const newCurrentEmployee = systemState.employees[systemState.currentUpIndex]
        details = `Cycled from ${previousEmployee?.name || "None"} to ${newCurrentEmployee?.name || "None"}`
        beforeStateForLog = { currentUp: previousEmployee?.name, currentUpIndex: beforeState.currentUpIndex }
        afterStateForLog = { currentUp: newCurrentEmployee?.name, currentUpIndex: systemState.currentUpIndex }
        break

      case "reorder":
        const oldOrder = systemState.employees.map((emp) => emp.name)
        systemState.employees = body.employees
        systemState.currentUpIndex = 0
        const newOrder = systemState.employees.map((emp) => emp.name)
        details = body.details || `Reordered employee queue`
        beforeStateForLog = { order: oldOrder }
        afterStateForLog = { order: newOrder }
        break

      case "toggle":
        const employeeToToggle = systemState.employees.find((emp) => emp.id === body.id)
        systemState.employees = systemState.employees.map((emp) =>
          emp.id === body.id ? { ...emp, isActive: !emp.isActive } : emp,
        )
        const toggledEmployee = systemState.employees.find((emp) => emp.id === body.id)
        details = `${toggledEmployee?.isActive ? "Activated" : "Deactivated"} employee: ${employeeToToggle?.name}`
        beforeStateForLog = {
          employee: employeeToToggle?.name,
          status: employeeToToggle?.isActive ? "active" : "inactive",
        }
        afterStateForLog = {
          employee: toggledEmployee?.name,
          status: toggledEmployee?.isActive ? "active" : "inactive",
        }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await setSystemState(systemState)

    // Log the action (don't fail if this fails)
    try {
      await addAuditLogEntry({
        action: body.action,
        user,
        source,
        details,
        beforeState: beforeStateForLog,
        afterState: afterStateForLog,
      })
    } catch (auditError) {
      console.error("Failed to log audit entry:", auditError)
    }

    return NextResponse.json(systemState)
  } catch (error) {
    console.error("Error updating system state:", error)
    return NextResponse.json(
      {
        error: "Failed to update system state",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
