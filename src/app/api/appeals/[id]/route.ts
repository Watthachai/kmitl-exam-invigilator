import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/lib/prisma';
import { getSocketIO } from '@/app/lib/socket-server';
import { logActivity } from '@/app/lib/activity-logger';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status, adminResponse } = await request.json();

    if (status === 'REJECTED' && !adminResponse) {
      return NextResponse.json(
        { error: 'Admin response is required for rejection' },
        { status: 400 }
      );
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: { 
        schedule: {
          include: {
            subjectGroup: {
              include: {
                subject: true
              }
            }
          }
        },
        user: true 
      }
    });

    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    // อัพเดท Appeal และ Schedule ในคราวเดียวกัน
    const [updatedAppeal] = await prisma.$transaction(async (tx) => {
      const updatedAppealResult = await tx.appeal.update({
        where: { id },
        data: {
          status,
          adminResponse,
          updatedAt: new Date()
        },
        include: {
          user: true,
          schedule: {
            include: {
              subjectGroup: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      await tx.schedule.update({
        where: { id: appeal.scheduleId },
        data: {
          notes: status === 'APPROVED' ? 
            appeal.type === 'CHANGE_DATE' 
              ? `ขอเปลี่ยนวันสอบ: (วันที่ต้องการ: ${appeal.preferredDates.map(d => 
                  new Date(d).toLocaleDateString('th-TH')).join(', ')})`
              : `หาผู้คุมสอบแทน: ${appeal.reason}` // แสดงเหตุผลสำหรับกรณีขอหาผู้คุมสอบแทน
            : undefined
        }
      });

      // Log activity within the same transaction
      await logActivity(
        'APPEAL_UPDATE',
        `Admin ${session.user.email} ${status} appeal for subject ${appeal.schedule.subjectGroup.subject.code} (${appeal.type === 'CHANGE_DATE' ? 'ขอเปลี่ยนวันสอบ' : 'ขอหาผู้คุมสอบแทน'})`,
        tx,
        session.user.id
      );

      return [updatedAppealResult];
    });

    // ส่ง Socket.IO event
    const io = getSocketIO();
    if (io && appeal.user) {
      io.to(appeal.user.id).emit('appealUpdated', updatedAppeal);
    }

    return NextResponse.json(updatedAppeal);

  } catch (error) {
    console.error('Failed to update appeal:', error);
    return NextResponse.json(
      { error: 'Failed to update appeal' },
      { status: 500 }
    );
  }
}