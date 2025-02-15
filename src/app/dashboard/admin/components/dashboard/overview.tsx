"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area } from 'recharts';
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { ImSpinner8 } from 'react-icons/im';

// Add interface for API response
interface ExamStatsResponse {
  date: string;
  morningCount: number;
  afternoonCount: number;
  roomCount: number;
}

// Update existing ExamStats interface if needed
interface ExamStats {
  date: string;
  morningCount: number;
  afternoonCount: number;
  total: number;
  rooms: number;
}

export function Overview() {
  const [examStats, setExamStats] = useState<ExamStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExamStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/stats/exams');
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json() as ExamStatsResponse[];
        
        // Transform data for the chart with proper typing
        const transformedData = data.map((item: ExamStatsResponse) => ({
          date: format(parseISO(item.date), 'd MMM', { locale: th }),
          morningCount: item.morningCount,
          afternoonCount: item.afternoonCount,
          total: item.morningCount + item.afternoonCount,
          rooms: item.roomCount
        }));

        setExamStats(transformedData);
      } catch (error) {
        console.error('Failed to fetch exam stats:', error);
        setError('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamStats();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ภาพรวมการสอบ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <ImSpinner8 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ภาพรวมการสอบ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-blue-500 hover:underline"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">ภาพรวมการสอบ</CardTitle>
          <p className="text-sm text-gray-500">แสดงจำนวนการสอบแต่ละวัน แยกตามช่วงเวลา</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={examStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="morningGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="afternoonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="morningCount"
                  name="ช่วงเช้า"
                  stroke="#4F46E5"
                  fill="url(#morningGradient)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, stroke: '#4338CA' }}
                />
                <Area
                  type="monotone"
                  dataKey="afternoonCount"
                  name="ช่วงบ่าย"
                  stroke="#10B981"
                  fill="url(#afternoonGradient)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, stroke: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>จำนวนห้องสอบ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="text-3xl font-bold text-blue-600">
              {examStats[examStats.length - 1]?.rooms || 0}
            </div>
            <p className="text-xs text-gray-500">
              จำนวนห้องสอบที่ใช้ในวันล่าสุด
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>จำนวนการสอบทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="text-3xl font-bold text-green-600">
              {examStats.reduce((acc, curr) => acc + curr.total, 0)}
            </div>
            <p className="text-xs text-gray-500">
              รวมจำนวนการสอบทั้งหมดในช่วงนี้
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}