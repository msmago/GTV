export type DebtStatus = 'PENDING' | 'OVERDUE' | 'COLLECTING' | 'PAID';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  city?: string;
  document?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Debt {
  id: string;
  clientId: string;
  amount: number;
  dueDate: any;
  status: DebtStatus;
  description?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Interaction {
  id: string;
  clientId: string;
  type: 'MESSAGE_SENT' | 'REPLY_RECEIVED' | 'NOTE' | 'AUTOMATION';
  content: string;
  timestamp: any;
  operatorId?: string;
}

export interface SystemSettings {
  pixKey: string;
  pixKeyType: 'CPF_CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  receiverName: string;
  city: string;
  updatedAt: any;
}
