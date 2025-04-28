'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import supabase from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { LeadTableCard, AddLeadDialog, CSVColumnMapper } from '@/components/leads';
import LeadManagementControls from '@/components/leads/LeadManagementControls';
import { Lead } from '@/types/leads';
import { motion } from 'framer-motion';

// Icons
import { AlertCircleIcon } from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { H1, P, Small } from '@/components/ui/typography';
import { Container } from '@/components/ui/container';
import { Flex } from '@/components/ui/flex';

// Mock data for initial testing - will be replaced with data from the API
const mockLeads: Lead[] = [
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  
  // CSV mapping state
  const [selectedCSVFile, setSelectedCSVFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Filter leads based on status, source, and search query
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.phone.includes(searchQuery) || 
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSource && matchesSearch;
  });

  // Get unique statuses and sources for filter dropdowns
  const uniqueStatuses = Array.from(new Set(leads.map(lead => lead.status)));
  const uniqueSources = Array.from(new Set(leads.map(lead => lead.source)));
  
  // Handle file selection
  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file is a CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }
    
    try {
      setSelectedCSVFile(file);
      
      // Read the first line to get headers
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return;
        
        // Get the first line
        const firstLine = content.split('\n')[0];
        
        // Determine if semicolon or comma is used as separator
        const separator = firstLine.includes(';') ? ';' : ',';
        
        // Split the headers and remove quotes if present
        const headers = firstLine.split(separator).map(header => 
          header.trim().replace(/^["'](.*)["']$/, '$1')
        );
        
        setCsvHeaders(headers);
        setIsColumnMapperOpen(true);
      };
      
      reader.readAsText(file);
    } catch (error: any) {
      console.error('Error reading CSV file:', error);
      toast.error('Error reading CSV file: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Process CSV upload with column mapping
  const handleColumnMappingConfirm = async (columnMapping: Record<string, string>) => {
    if (!selectedCSVFile || !user) return;
    
    setIsUploadingCSV(true);
    
    try {
      // Get current session for authentication
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Authentication error: No valid session token found. Please log in again.');
        setIsUploadingCSV(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', selectedCSVFile);
      
      // Add column mapping to form data
      formData.append('columnMapping', JSON.stringify(columnMapping));
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.error || 'Failed to upload CSV';
        throw new Error(errorMessage);
      }
      
      toast.success(result.message || 'CSV uploaded successfully');
      fetchLeads(); // Refresh leads list
      setIsColumnMapperOpen(false);
    } catch (error: any) {
      console.error('CSV upload error details:', error);
      toast.error(error.message || 'Failed to upload CSV');
    } finally {
      setIsUploadingCSV(false);
      setSelectedCSVFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        toast.error('Authentication error: Please log in again');
        return;
      }
      
      const response = await fetch(`/api/leads?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete lead');
      }
      
      toast.success('Lead deleted successfully');
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== id));
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error(error.message || 'Failed to delete lead');
    }
  };

  return (
    <DashboardLayout>
      <Container className="w-full" size="full" padding="none">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {/* Header Section */}
          <motion.div 
            className="mb-6 w-full"
            variants={itemVariants}
          >
            <H1 className="mb-1 text-gray-800">Lead Management</H1>
            <Small className="text-gray-600">
              Track and manage your customer leads in one place
            </Small>
          </motion.div>

          {/* Control Section - Using the new component */}
          <LeadManagementControls
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            isLoading={isLoading}
            fetchLeads={fetchLeads}
            uniqueStatuses={uniqueStatuses}
            uniqueSources={uniqueSources}
            isUploadingCSV={isUploadingCSV}
            handleCSVUpload={handleFileSelection}  // Updated to use new file selection handler
            openAddLeadDialog={() => setIsAddLeadDialogOpen(true)}
          />

        {error && (
            <motion.div variants={itemVariants} className="my-4 w-full">
              <Card className="border-red-300 shadow-md w-full">
                <CardHeader className="bg-red-50 text-red-800">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircleIcon className="h-5 w-5" />
                    Error
                  </CardTitle>
                  <CardDescription className="text-red-700">{error}</CardDescription>
                </CardHeader>
                <CardFooter className="bg-red-50">
                  <Button 
                    onClick={fetchLeads}
                    variant="outline"
                    className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  >
                    Try again
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* Leads Table Section */}
          <motion.div 
            variants={itemVariants}
            className="mt-6 w-full"
            style={{ width: '100%', maxWidth: '100%', margin: 0, marginTop: '1.5rem', padding: 0 }}
          >
            <LeadTableCard
              leads={leads}
              filteredLeads={filteredLeads}
              isLoading={isLoading}
              searchQuery={searchQuery}
              handleDeleteLead={handleDeleteLead}
              fetchLeads={fetchLeads}
            />
          </motion.div>
        </motion.div>
      </Container>
      
      {/* Add Lead Dialog */}
      <AddLeadDialog 
        onLeadAdded={fetchLeads} 
        isOpen={isAddLeadDialogOpen}
        setIsOpen={setIsAddLeadDialogOpen}
      />
      
      {/* CSV Column Mapper Dialog */}
      <CSVColumnMapper
        isOpen={isColumnMapperOpen}
        setIsOpen={setIsColumnMapperOpen}
        csvHeaders={csvHeaders}
        onColumnsMapConfirm={handleColumnMappingConfirm}
        isProcessing={isUploadingCSV}
      />
    </DashboardLayout>
  );
} 