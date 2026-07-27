export interface LeadEvaluation {
  salud: number;
  edad25_50: number;
  enParejaCasado: number;
  duenoCasa: number;
  hijos: number;
  trabaja: number;
  puntos: number;
  observacion?: string;
  usState?: string;
  isQualified?: boolean;
}

export interface Client {
  _id?: string;
  id?: string; // For compatibility
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  preferredLanguage?: string;
  clientStatus?: 'prospect' | 'active' | 'in_process' | 'inactive' | 'closed';
  status?: 'prospect' | 'active' | 'in_process' | 'in_progress' | 'inactive' | 'closed'; // For compatibility
  source?: 'referral' | 'social_media' | 'website' | 'call' | 'phone_call' | 'whatsapp' | 'office' | 'other';
  services?: string[]; // Array of Service IDs
  assignedServices?: string[]; // For compatibility
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string; // Agent name/ID
  assignedAgent?: string; // For compatibility
  internalNotes?: string;
  notes?: string; // For compatibility
  leadEvaluation?: LeadEvaluation;
  isUnsaved?: boolean;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}
