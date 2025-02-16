'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { FiClock, FiMapPin, FiBook, FiUsers, FiNavigation, FiCalendar } from 'react-icons/fi';
import { ImSpinner8 } from 'react-icons/im';

// UI Components
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Calendar } from "@/app/components/ui/calendar";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

interface InvigilatorResponse {
  id: string;
  name: string;
  type: string;
}

interface RawSchedule {
  id: string;
  date: string;
  scheduleDateOption: 'MORNING' | 'AFTERNOON';
  room: {
    id: string;
    building: string;    // Added building
    roomNumber: string;  // Changed name to roomNumber
  };
  subjectGroup: {
    subject: {
      id: string;
      name: string;
      code: string;
    };
  };
  invigilators: InvigilatorResponse[];
}

interface Schedule {
  id: string;
  date: Date;
  scheduleDateOption: 'MORNING' | 'AFTERNOON';
  room: {
    id: string;
    building: string;    // Added building
    roomNumber: string;  // Changed name to roomNumber
  };
  subjectGroup: {
    subject: {
      id: string;
      name: string;
      code: string;
    };
  };
  invigilators: Array<{
    id: string;
    name: string;
    type: string;
    }
>};

export default function SchedulePage() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('calendar');
  const [nextExam, setNextExam] = useState<Schedule | null>(null);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/schedules/my-schedule');
      const data = await response.json();
      
      // Transform and validate data
      const transformedSchedules = (data || []).map((item: RawSchedule) => ({
        id: item?.id || '',
        date: item?.date ? new Date(item.date) : new Date(),
        scheduleDateOption: item?.scheduleDateOption || 'MORNING',
        room: {
          id: item?.room?.id || '',
          building: item?.room?.building || '',
          roomNumber: item?.room?.roomNumber || ''
        },
        subjectGroup: {
          subject: {
            id: item?.subjectGroup?.subject?.id || '',
            name: item?.subjectGroup?.subject?.name || '',
            code: item?.subjectGroup?.subject?.code || ''
          }
        },
        invigilators: Array.isArray(item?.invigilators) 
          ? item.invigilators.map((inv: InvigilatorResponse) => ({
              id: inv?.id || '',
              name: inv?.name || '',
              type: inv?.type || ''
            }))
          : []
      }));

      setSchedules(transformedSchedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch schedules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchSchedules();
    }
  }, [session]);

  useEffect(() => {
    if (schedules.length > 0) {
      const now = new Date();
      const nextSchedule = schedules.find(s => new Date(s.date) >= now);
      setNextExam(nextSchedule || null);
    }
  }, [schedules]);

  // Enhanced Schedule Card with more details
  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FiCalendar className="text-blue-500" />
            <span className="font-medium">
              {format(schedule.date, 'EEEE d MMMM yyyy', { locale: th })}
            </span>
          </div>
          <Badge variant={schedule.scheduleDateOption === 'MORNING' ? "default" : "secondary"}>
            {schedule.scheduleDateOption === 'MORNING' ? 'ช่วงเช้า 🌅' : 'ช่วงบ่าย 🌇'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <FiClock className="text-orange-500 mt-1" />
          <span className="font-medium">
            {schedule.scheduleDateOption === 'MORNING' ? '09:30 - 12:30' : '13:30 - 16:30'}
          </span>
        </div>

        <div className="flex items-start space-x-3">
          <FiBook className="text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">{schedule.subjectGroup.subject.code}</h3>
            <p className="text-gray-600">{schedule.subjectGroup.subject.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <FiMapPin className="text-red-500" />
          <div className="flex items-center space-x-2">
            <span className="text-gray-700 font-medium">
              {schedule.room.building} ห้อง {schedule.room.roomNumber}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=KMITL+${schedule.room.building}+${schedule.room.roomNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
            >
              <FiNavigation className="w-4 h-4 mr-1" />
              <span className="text-sm">นำทาง</span>
            </a>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <FiUsers className="text-purple-500 mt-1" />
          <div className="flex flex-wrap gap-2">
            {schedule.invigilators.map((invigilator) => (
              <Badge 
                key={invigilator.id} 
                variant="outline"
                className="px-3 py-1 bg-purple-50"
              >
                {invigilator.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {nextExam && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>การคุมสอบครั้งถัดไป: {format(new Date(nextExam.date), 'EEEE d MMMM yyyy', { locale: th })}</span>
              <Badge variant="outline">{nextExam.room.building} ห้อง {nextExam.room.roomNumber}</Badge>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">ตารางคุมสอบของฉัน</h1>
          <Tabs
            value={selectedView}
            onValueChange={(value) => setSelectedView(value as 'calendar' | 'list')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="calendar">ปฏิทิน</TabsTrigger>
              <TabsTrigger value="list">รายการ</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <AnimatePresence mode="wait">
          {selectedView === 'calendar' ? (
            <CalendarView 
              schedules={schedules}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              ScheduleCard={ScheduleCard}
            />
          ) : (
            <ListView 
              schedules={schedules}
              error={error}
              ScheduleCard={ScheduleCard}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}

function CalendarView({ 
  schedules, 
  selectedDate, 
  setSelectedDate, 
  ScheduleCard 
}: { 
  schedules: Schedule[]
  selectedDate: Date | undefined
  setSelectedDate: (date: Date | undefined) => void
  ScheduleCard: React.FC<{ schedule: Schedule }>
}) {
  // Add null check for selectedDate
  const selectedDateSchedules = selectedDate 
    ? schedules.filter(schedule => 
        schedule.date && schedule.date.toDateString() === selectedDate.toDateString()
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid md:grid-cols-[340px,1fr] gap-6"
    >
      <Card className="p-4">
        <Calendar
          selected={selectedDate}
          onSelect={(date) => {
            // Add validation before setting the date
            if (date && !isNaN(date.getTime())) {
              setSelectedDate(date);
            }
          }}
          className="rounded-md"
          modifiers={{
            scheduled: (date) => {
              if (!date) return false;
              return schedules.some(schedule => 
                schedule.date && 
                schedule.date.toDateString() === date.toDateString()
              );
            }
          }}
          modifiersClassNames={{
            scheduled: "bg-blue-100 text-blue-900 hover:bg-blue-200 rounded-full"
          }}
        />
      </Card>

      <div className="space-y-4">
        {selectedDate && (
          <div className="flex items-center gap-2 text-gray-600">
            <FiCalendar />
            <span>
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: th })}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <div className="grid gap-4">
            {selectedDateSchedules.length > 0 ? (
              selectedDateSchedules.map((schedule) => (
                schedule && <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {selectedDate 
                    ? 'ไม่พบตารางคุมสอบในวันที่เลือก' 
                    : 'กรุณาเลือกวันที่เพื่อดูตารางคุมสอบ'
                  }
                </p>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ListView({ 
  schedules, 
  error, 
  ScheduleCard 
}: {
  schedules: Schedule[];
  error: string | null;
  ScheduleCard: React.FC<{ schedule: Schedule }>;
}) {
  // Group schedules by month
  const groupedSchedules = schedules.reduce<Record<string, Schedule[]>>((acc, schedule) => {
    const monthKey = format(schedule.date, 'MMMM yyyy', { locale: th });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(schedule);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : Object.keys(groupedSchedules).length > 0 ? (
        Object.entries(groupedSchedules).map(([month, monthSchedules]) => (
          <div key={month} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">{month}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {monthSchedules
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(schedule => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))
              }
            </div>
          </div>
        ))
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">ไม่มีตารางคุมสอบ</p>
        </div>
      )}
    </motion.div>
  );
}