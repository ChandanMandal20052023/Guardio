export type TransactionStatus = 'safe' | 'suspicious' | 'fraud' | 'blocked';

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  category: string;
  cardLast4: string;
  location: string;
  reason?: string;
  confidence?: number;
}

export interface Alert {
  id: string;
  type: 'fraud' | 'blocked' | 'unusual';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  transactionId: string;
}

// Extra types to replace the empty arrays you had for analytics
export interface WeeklySpending {
  day: string;
  amount: number;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
}