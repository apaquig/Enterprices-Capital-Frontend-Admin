import { Client } from './client.model';
import { Service } from './service.model';
import { User } from './user.model';

export interface Appointment {
  _id?: string;
  id?: string;
  client: string | Partial<Client> | any;
  service: string | Partial<Service> | any;
  assignedTo?: string | Partial<User> | any;
  dateTime: string | Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  meetingType: 'virtual' | 'in_person';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
