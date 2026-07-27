export interface Service {
  _id?: string;
  id?: string; // For compatibility
  name: string;
  category: string;
  description?: string;
  estimatedPrice?: number;
  status?: 'active' | 'inactive';
  estimatedDuration?: string;
  requiredDocuments?: string[];
  internalNotes?: string;
  notes?: string; // For compatibility
  createdAt?: string;
  updatedAt?: string;
}
