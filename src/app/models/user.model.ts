export interface User {
  _id?: string;
  id?: string; // For compatibility
  name?: string; // For compatibility
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}
