# API Documentation

## Overview
Documentation of API endpoints for the KMITL Exam Invigilator System.

## Authentication
- Uses NextAuth.js for authentication
- Session-based auth with `useSession` hook
- Required for all protected endpoints

## Endpoints

### Schedules

#### GET /api/schedules
Fetches all exam schedules

Response:
```typescript
interface Schedule {
    id: string;
    date: Date; 
    startTime: Date;
    endTime: Date;
    notes?: string;
    room: {
        id: string;
        building: string;
        roomNumber: string;
        capacity?: number;
    };
    subjectGroup: {
        id: string; 
        groupNumber: string;
        year?: number;
        studentCount?: number;
        professor: {
            name: string;
        };
        subject: {
            code: string;
            name: string;
            department: {
                name: string;
            };
        };
    };
    invigilator?: {
        id: string;
        name: string;
        type?: string;
    };
}
```

### Import/Export

#### POST /api/import-excel
Imports exam schedule from Excel file

Request Body:
```typescript
interface ImportRequest {
    data: ExamData[];
    scheduleOption: 'ช่วงเช้า' | 'ช่วงบ่าย';
    examDate: string;
}

interface ExamData {
    'ลำดับ': number;
    'วิชา': string;
    'กลุ่ม': string;
    'ชั้นปี': string;
    'นศ.': string;
    'เวลา': string;
    'ผู้สอน': string;
    'อาคาร': string;
    'ห้อง': string;
    'หมายเหตุ'?: string;
}
```

### Users & Sessions

#### GET /api/sessions
Gets active user sessions

Response:
```typescript
interface ActiveSession {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    expires: string;
}
```

#### DELETE /api/sessions
Forces user logout

Request Body:
```typescript
{
    sessionId: string;
    userId: string;
}
```

### Activity Logging

#### POST /api/activity
Logs system activity

Request Body:
```typescript
interface Activity {
    type: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN';
    description: string;
    userId?: string;
}
```

### Data Models

Core data models used across the API:

```typescript
interface Department {
    id: string;
    name: string;
    code: string;
    codes: string[];
}

interface Professor {
    id: string;
    name: string;
    department: {
        name: string;
    };
}

interface SubjectGroup {
    id: string;
    groupNumber: string;
    subject: {
        code: string;
        name: string;
    };
}

interface Room {
    id: string;
    building: string;
    roomNumber: string;
    schedules: Schedule[];
    createdAt: Date;
    updatedAt: Date; 
}

interface Invigilator {
    id: string;
    name: string;
    type: string;
    departmentId: string;
    department?: Department;
    professorId?: string;
    professor?: Professor;
    quota: number;
    assignedQuota: number;
}
```

### Error Handling

All endpoints return standardized error responses:

```typescript
{
    error: string;
    statusCode: number;
    message: string;
}
```

Common status codes:
- 200: Success
- 400: Bad Request 
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
