export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'user';
}

export interface Client {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  whatsapp: string | null;
  email: string | null;
  responsible: string | null;
  registrationNumber: string | null;
  minutesNumber: string | null;
  registrationDate: string | null;
  userCreated: string | null;
  deadline: string | null;
}

export interface Contract {
  id: string;
  clientId: string;
  contractNumber: string | null;
  processNumber: string | null;
  description: string | null;
  contractDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  totalValue: number | null;
}

export interface ServiceItem {
  id: string;
  contractId: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  date: string | null;
  userCreated: string | null;
  
  // Workflow fields
  receptionDate: string | null;
  internalDeadline: string | null;
  clientDeadline: string | null;
  executorId: string | null; // Profile ID
  
  startReviewDate: string | null;
  endReviewDate: string | null;
  
  supervisorObservation: string | null;
  status: 'pending' | 'in_progress' | 'conference' | 'review' | 'approved' | 'delivered';
  
  clientApprovalDate: string | null;
  artEmissionDate: string | null;
  invoiceEmissionDate: string | null;
  billingDeadline: string | null;
}

export interface ServiceItemComment {
  id: string;
  itemId: string;
  text: string;
  author: string;
  date: string;
}

export interface Measurement {
  id: string;
  itemId: string;
  date: string | null;
  description: string | null; // Observation
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  userCreated: string | null;
}

export interface MeasurementAttachment {
  id: string;
  measurementId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string | null;
  date: string;
}

export interface Task {
  id: string;
  title: string | null;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo: string | null; // User email or name
  createdBy: string | null;
  clientId: string | null;
  contractId: string | null;
  deadline: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  text: string;
  author: string;
  date: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  name: string;
  url: string;
  type: string; // 'image', 'pdf', 'xls', etc.
  uploadedBy: string;
  date: string;
}

export interface ContractAttachment {
    id: string;
    contractId: string;
    name: string;
    url: string;
    type: string;
    uploadedBy: string;
    date: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    author: string; // User Name
    sender_id: string; // User UUID
    recipient_id?: string | null; // User UUID (null for public)
    timestamp: string;
}