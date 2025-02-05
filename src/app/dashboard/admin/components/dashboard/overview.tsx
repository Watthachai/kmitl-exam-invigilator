// app/dashboard/components/dashboard/overview.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const examData = [
  { date: 'Jan', morningExams: 2, afternoonExams: 3 },
  { date: 'Feb', morningExams: 1, afternoonExams: 4 },
  { date: 'Mar', morningExams: 3, afternoonExams: 2 },
  { date: 'Apr', morningExams: 4, afternoonExams: 1 },
  { date: 'May', morningExams: 2, afternoonExams: 3 },
  { date: 'Jun', morningExams: 3, afternoonExams: 2 },
];

export function Overview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Schedule Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={examData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="morningExams" 
                stroke="#8884d8" 
                name="Morning Exams"
              />
              <Line 
                type="monotone" 
                dataKey="afternoonExams" 
                stroke="#82ca9d"
                name="Afternoon Exams" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}