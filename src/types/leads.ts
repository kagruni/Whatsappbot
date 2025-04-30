export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'New' | 'Contacted' | 'Replied' | 'Failed' | 'Converted' | string;
  source: string;
  created_at: string;
  message_read?: boolean;
  title?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  company_name?: string;
} 