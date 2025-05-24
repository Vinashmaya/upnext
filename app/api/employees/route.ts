import { NextResponse } from "next/server"

// In a real application, this would connect to a database
let employees = [
  { id: "1", name: "John Smith", isActive: true },
  { id: "2", name: "Sarah Johnson", isActive: true },
  { id: "3", name: "Mike Davis", isActive: true },
  { id: "4", name: "Emily Brown", isActive: true },
]

let currentUpIndex = 0

export async function GET() {
  return NextResponse.json({
    employees,
    currentUp: employees[currentUpIndex] || null,
    currentUpIndex,
  })
}

export async function POST(request: Request) {
  const body = await request.json()

  switch (body.action) {
    case "add":
      const newEmployee = {
        id: Date.now().toString(),
        name: body.name,
        isActive: true,
      }
      employees.push(newEmployee)
      break

    case "remove":
      employees = employees.filter((emp) => emp.id !== body.id)
      if (currentUpIndex >= employees.length) {
        currentUpIndex = 0
      }
      break

    case "cycle":
      if (employees.length > 0) {
        currentUpIndex = (currentUpIndex + 1) % employees.length
      }
      break

    case "reorder":
      employees = body.employees
      currentUpIndex = 0
      break

    case "toggle":
      employees = employees.map((emp) => (emp.id === body.id ? { ...emp, isActive: !emp.isActive } : emp))
      break
  }

  return NextResponse.json({
    employees,
    currentUp: employees[currentUpIndex] || null,
    currentUpIndex,
  })
}
