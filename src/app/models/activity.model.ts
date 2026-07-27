export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  type: 'client' | 'service' | 'property' | 'auth' | 'system';
}
