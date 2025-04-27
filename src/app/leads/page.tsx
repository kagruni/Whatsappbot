'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, Title, Text, Button, Badge, Select, SelectItem, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { HiOutlineRefresh, HiOutlineExternalLink, HiOutlineTrash, HiOutlineDocumentAdd, HiOutlineUpload } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import supabase from '@/lib/supabase';

// Types
interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  source: string;
  created_at: string;
}

// Mock data for initial testing - will be replaced with data from the API
const mockLeads = [
  {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'New Lead',
    source: 'WhatsApp',
    created_at: '2025-04-20',
  },
  // ... other mock leads
];

const statusColors: Record<string, string> = {
  'New Lead': 'blue',
  'In Progress': 'yellow',
  'Contacted': 'purple',
  'Qualified': 'green',
  'Closed': 'gray',
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New form state
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'WhatsApp'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user && !authLoading) {
      fetchLeads();
    }
  }, [user, authLoading]);
  
  const fetchLeads = async () => {
    if (!user) {
      setError('You must be logged in to view leads');
      setLeads([]);
      setIsLoading(false);
      return;
    }
    
    setError(null);
    setIsLoading(true);
    try {
      // First try to fetch directly from Supabase for better error handling
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        setLeads(data);
        return;
      }
      
      // Fall back to API route if direct query fails
      const response = await fetch('/api/leads');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch leads: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const apiData = await response.json();
      setLeads(apiData);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      setError(error.message || 'Failed to fetch leads');
      toast.error(`Failed to fetch leads: ${error.message || 'Unknown error'}`);
      // Fall back to mock data in development environment only
      if (process.env.NODE_ENV === 'development') {
        setLeads(mockLeads);
        toast.info('Using mock data for development');
      } else {
        setLeads([]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter leads based on status and source
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesStatus && matchesSource;
  });

  // Get unique statuses and sources for filter dropdowns
  const uniqueStatuses = Array.from(new Set(leads.map(lead => lead.status)));
  const uniqueSources = Array.from(new Set(leads.map(lead => lead.source)));
  
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file is a CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }
    
    setIsUploadingCSV(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload CSV');
      }
      
      toast.success(result.message || 'CSV uploaded successfully');
      fetchLeads(); // Refresh leads list
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast.error(error.message || 'Failed to upload CSV');
    } finally {
      setIsUploadingCSV(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      const response = await fetch(`/api/leads?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete lead');
      }
      
      toast.success('Lead deleted successfully');
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== id));
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error(error.message || 'Failed to delete lead');
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/leads/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLead.name,
          phone: newLead.phone,
          email: newLead.email || null,
          source: newLead.source,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add lead');
      }
      
      toast.success('Lead added successfully');
      setNewLead({ name: '', phone: '', email: '', source: 'WhatsApp' });
      setIsAddingLead(false);
      fetchLeads(); // Refresh leads list
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast.error(error.message || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Lead Management</h1>
        <p className="text-gray-600">
          Manage your customer leads
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 font-medium">{error}</p>
          <button 
            onClick={fetchLeads} 
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
            className="w-48"
          >
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </Select>
          <Select 
            value={sourceFilter} 
            onValueChange={setSourceFilter}
            className="w-48"
          >
            <SelectItem value="all">All Sources</SelectItem>
            {uniqueSources.map(source => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button 
            icon={HiOutlineRefresh}
            variant="secondary"
            onClick={fetchLeads}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button 
            icon={HiOutlineUpload}
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={isUploadingCSV}
          >
            Upload CSV
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCSVUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <Button 
            icon={HiOutlineDocumentAdd}
            onClick={() => setIsAddingLead(true)}
          >
            Add Lead
          </Button>
        </div>
      </div>

      <Card>
        <Title>Leads</Title>
        <Text className="mb-4">Complete list of leads in your system</Text>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Source</TableHeaderCell>
              <TableHeaderCell>Date Added</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No leads match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <motion.tr 
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="border-b"
                >
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{lead.phone}</div>
                      <div className="text-xs text-gray-500">{lead.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={statusColors[lead.status] || 'gray'}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button 
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        title="View Details"
                        tabIndex={0}
                        aria-label="View lead details"
                        onClick={() => {/* View lead details */}}
                        onKeyDown={(e) => e.key === 'Enter' && {/* View lead details */}}
                      >
                        <HiOutlineExternalLink className="h-5 w-5" />
                      </button>
                      <button 
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete lead"
                        tabIndex={0}
                        aria-label="Delete lead"
                        onClick={() => handleDeleteLead(lead.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleDeleteLead(lead.id)}
                      >
                        <HiOutlineTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {isAddingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Title>Add New Lead</Title>
                <button 
                  onClick={() => setIsAddingLead(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={0}
                  aria-label="Close dialog"
                  onKeyDown={(e) => e.key === 'Enter' && setIsAddingLead(false)}
                >
                  ✕
                </button>
              </div>
              <form className="space-y-4" onSubmit={handleAddLead}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input 
                    id="name"
                    name="name"
                    type="text" 
                    value={newLead.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Full Name" 
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                  <input 
                    id="phone"
                    name="phone"
                    type="tel" 
                    value={newLead.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="+1234567890" 
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    id="email"
                    name="email"
                    type="email" 
                    value={newLead.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="email@example.com" 
                  />
                </div>
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-gray-700">Source</label>
                  <select 
                    id="source"
                    name="source"
                    value={newLead.source}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => setIsAddingLead(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    loading={isSubmitting}
                  >
                    Add Lead
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
} 