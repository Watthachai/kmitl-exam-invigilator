import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subjects: true,
            professors: true,
            invigilators: true
          }
        }
      }
    });

    // Transform the data to include codes array
    const transformedDepartments = departments.map(dept => ({
      ...dept,
      codes: [dept.code, ...((dept.metadata as { codes?: string[] })?.codes || [])].filter(Boolean)
    }));

    return NextResponse.json(transformedDepartments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch departments' 
    }, { 
      status: 500 
    });
  }
}

export async function POST(request: Request) {
  try {
    const { name, codes } = await request.json();
    
    if (!name || !codes?.length) {
      return NextResponse.json({
        error: 'Name and at least one code are required'
      }, { 
        status: 400 
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: codes[0], // Primary code
        metadata: {
          codes: codes.slice(1) // Additional codes
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subjects: true,
            professors: true,
            invigilators: true
          }
        }
      }
    });

    return NextResponse.json({
      ...department,
      codes: [department.code, ...((department.metadata as { codes?: string[] })?.codes || [])].filter(Boolean)
    });

  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ 
      error: 'Failed to create department' 
    }, { 
      status: 500 
    });
  }
}