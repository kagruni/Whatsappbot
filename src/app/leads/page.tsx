'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import supabase from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

// Icons
import { 
  DownloadIcon, 
  PlusCircleIcon, 
  RefreshCcwIcon, 
  SearchIcon, 
  TrashIcon, 
  ExternalLinkIcon, 
  FileIcon,
  CalendarIcon,
  SmartphoneIcon,
  MailIcon
} from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'New Lead':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Contacted':
        return 'outline';
      case 'Qualified':
        return 'success';
      case 'Closed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <DashboardLayout>
      <style jsx global>{`
        /* Make all text black in the leads page */
        .leads-page,
        .leads-page * {
          color: black !important;
        }
        
        /* Preserve the color of destructive elements */
        .border-destructive * {
          color: rgb(239, 68, 68) !important;
        }
        
        /* Make sure icons are visible */
        .leads-page svg {
          stroke: black;
        }
        
        /* Dialog content should also be black */
        [role="dialog"] * {
          color: black !important;
        }
        
        /* Make sure placeholder text is visible */
        .leads-page input::placeholder {
          color: rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
      
      <div className="space-y-6 leads-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="mt-2">
            Track and manage your customer leads in one place
          </p>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader className="text-destructive">
              <CardTitle className="text-destructive flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" x2="12" y1="8" y2="12"></line>
                  <line x1="12" x2="12.01" y1="16" y2="16"></line>
                </svg>
                Error
              </CardTitle>
              <CardDescription className="text-destructive">{error}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={fetchLeads}>
                Try again
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
              <Input 
                placeholder="Search leads..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Status</SelectLabel>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Source</SelectLabel>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" onClick={fetchLeads} disabled={isLoading}>
              <RefreshCcwIcon className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingCSV}
              className="gap-2"
            >
              <FileIcon className="h-4 w-4" />
              <span>Upload CSV</span>
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCSVUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircleIcon className="h-4 w-4" />
                  <span>Add Lead</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Fill in the details to add a new lead to your system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLead} className="space-y-4">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={newLead.name}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={newLead.phone}
                        onChange={handleInputChange}
                        placeholder="+1234567890"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newLead.email}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="source" className="text-right">
                        Source
                      </Label>
                      <Select 
                        name="source" 
                        value={newLead.source} 
                        onValueChange={(value: string) => setNewLead({...newLead, source: value})}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add Lead"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Your Leads 
              <Badge className="ml-2">{filteredLeads.length}</Badge>
            </CardTitle>
            <CardDescription>
              Manage and track all your leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileIcon className="h-10 w-10 mb-2 opacity-20" />
                        {searchQuery ? 'No leads match your search' : 'No leads found'}
                        <Button variant="link" onClick={fetchLeads} className="mt-2">
                          Refresh
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="group"
                    >
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-sm">
                            <SmartphoneIcon className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1 text-xs mt-1">
                              <MailIcon className="h-3 w-3" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            tabIndex={0}
                            aria-label="View lead details"
                            onClick={() => {/* View lead details */}}
                            onKeyDown={(e) => e.key === 'Enter' && {/* View lead details */}}
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            tabIndex={0}
                            aria-label="Delete lead"
                            onClick={() => handleDeleteLead(lead.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDeleteLead(lead.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <div className="text-sm">
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="gap-1">
                <DownloadIcon className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
} 