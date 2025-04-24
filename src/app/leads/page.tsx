'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, Title, Text, Button, Badge, Select, SelectItem, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { HiOutlineRefresh, HiOutlineExternalLink, HiOutlineTrash, HiOutlineDocumentAdd } from 'react-icons/hi';

// Mock data - in a real application, this would come from your Trello integration
const mockLeads = [
  {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'New Lead',
    source: 'WhatsApp',
    dateAdded: '2025-04-20',
    trelloCardId: 'card123',
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '+0987654321',
    email: 'jane.smith@example.com',
    status: 'In Progress',
    source: 'Website',
    dateAdded: '2025-04-19',
    trelloCardId: 'card456',
  },
  {
    id: '3',
    name: 'Robert Johnson',
    phone: '+1122334455',
    email: 'robert.johnson@example.com',
    status: 'Contacted',
    source: 'WhatsApp',
    dateAdded: '2025-04-18',
    trelloCardId: 'card789',
  },
  {
    id: '4',
    name: 'Lisa Williams',
    phone: '+5544332211',
    email: 'lisa.williams@example.com',
    status: 'Qualified',
    source: 'WhatsApp',
    dateAdded: '2025-04-15',
    trelloCardId: 'card101',
  },
  {
    id: '5',
    name: 'Michael Brown',
    phone: '+6677889900',
    email: 'michael.brown@example.com',
    status: 'Closed',
    source: 'Referral',
    dateAdded: '2025-04-10',
    trelloCardId: 'card112',
  },
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
  
  // Filter leads based on status and source
  const filteredLeads = mockLeads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesStatus && matchesSource;
  });

  // Get unique statuses and sources for filter dropdowns
  const uniqueStatuses = Array.from(new Set(mockLeads.map(lead => lead.status)));
  const uniqueSources = Array.from(new Set(mockLeads.map(lead => lead.source)));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Lead Management</h1>
        <p className="text-gray-600">
          Manage leads synced with Trello
        </p>
      </div>

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
          >
            Sync with Trello
          </Button>
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
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No leads match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
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
                  <TableCell>{lead.dateAdded}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button 
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="View in Trello"
                      >
                        <HiOutlineExternalLink className="h-5 w-5" />
                      </button>
                      <button 
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete lead"
                      >
                        <HiOutlineTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {isAddingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <Title>Add New Lead</Title>
              <button 
                onClick={() => setIsAddingLead(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input 
                  type="text" 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Full Name" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input 
                  type="tel" 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="+1234567890" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="email@example.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option>WhatsApp</option>
                  <option>Website</option>
                  <option>Referral</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="secondary" onClick={() => setIsAddingLead(false)}>
                  Cancel
                </Button>
                <Button>
                  Add Lead
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
} 