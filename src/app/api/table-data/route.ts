// app/api/table-data/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    const savedData = await prisma.tableData.create({
      data: {
        data: data
      }
    })

    return NextResponse.json({ success: true, data: savedData })
  } catch (error) {
    console.error('Error saving data:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const data = await prisma.tableData.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}