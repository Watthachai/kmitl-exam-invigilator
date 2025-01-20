// src/app/types/dashboard.ts
export interface Activity {
    user: string;
    amount: number;
    date: string;
    type: 'Deposit' | 'Payment' | 'Withdrawal';
    account: string;
    progress: number;
  }
  
  export interface StatsData {
    clients: {
      total: number;
      percentage: number;
    };
    sales: {
      total: number;
      percentage: number;
    };
    performance: {
      value: number;
      percentage: number;
    };
  }


export interface ProcessedData {

  subject: {

    code: string;

    name: string;

  };

  room: {

    building: string;

    roomNumber: string;

  };

  professors: string[];

  subjectGroup: {

    groupNumber: string;

    year: number;

    studentCount: number;

  };

}

export interface TableRow {
  ลำดับ: string;
  วิชา: string;
  กลุ่ม: string;
  ชั้นปี: string;
  นศ: string;
  เวลา: string;
  ผู้สอน: string;
  อาคาร: string;
  ห้อง: string;
  หมายเหตุ: string;
}