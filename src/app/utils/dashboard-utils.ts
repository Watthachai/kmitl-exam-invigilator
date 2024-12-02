// src/app/dashboard/utils/dashboard-utils.ts
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  export const calculatePercentageChange = (current: number, previous: number): number => {
    return ((current - previous) / previous) * 100;
  };
  
  export const getProgressColor = (progress: number): string => {
    if (progress >= 70) return 'text-green-500';
    if (progress >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };