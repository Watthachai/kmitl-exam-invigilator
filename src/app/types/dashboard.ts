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