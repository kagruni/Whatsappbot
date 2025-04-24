'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, Title, Badge, Text, TextInput, Select, SelectItem } from '@tremor/react';
import { HiOutlineSearch, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';

// Mock data - in a real application, this would come from your API
const mockConversations = [
  {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    lastMessage: 'I would like to know more about your product',
    timestamp: '2h ago',
    status: 'active',
    unread: 2,
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '+0987654321',
    lastMessage: 'Thanks for the information',
    timestamp: '5h ago',
    status: 'active',
    unread: 0,
  },
  {
    id: '3',
    name: 'Robert Johnson',
    phone: '+1122334455',
    lastMessage: 'When will my order arrive?',
    timestamp: '1d ago',
    status: 'pending',
    unread: 1,
  },
  {
    id: '4',
    name: 'Lisa Williams',
    phone: '+5544332211',
    lastMessage: 'Perfect, thank you!',
    timestamp: '2d ago',
    status: 'closed',
    unread: 0,
  },
  {
    id: '5',
    name: 'Michael Brown',
    phone: '+6677889900',
    lastMessage: 'Can you provide more details?',
    timestamp: '3d ago',
    status: 'active',
    unread: 0,
  },
];

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  
  // Filter conversations based on search term and status
  const filteredConversations = mockConversations.filter(conversation => {
    const matchesSearch = 
      conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.phone.includes(searchTerm) ||
      conversation.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      conversation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (id: string) => {
    if (expandedConversation === id) {
      setExpandedConversation(null);
    } else {
      setExpandedConversation(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Conversations</h1>
        <p className="text-gray-600">
          Manage and monitor your WhatsApp conversations
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <TextInput
          icon={HiOutlineSearch}
          placeholder="Search by name, phone, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
          className="max-w-xs"
        >
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <Card className="p-6 text-center">
            <Text>No conversations match your filters</Text>
          </Card>
        ) : (
          filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="overflow-hidden">
              <div 
                className="p-4 cursor-pointer flex justify-between items-center"
                onClick={() => toggleExpand(conversation.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {conversation.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium">{conversation.name}</h3>
                      {conversation.unread > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                          {conversation.unread} new
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{conversation.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge color={
                    conversation.status === 'active' ? 'green' :
                    conversation.status === 'pending' ? 'yellow' : 'gray'
                  }>
                    {conversation.status}
                  </Badge>
                  <span className="text-sm text-gray-500">{conversation.timestamp}</span>
                  {expandedConversation === conversation.id ? 
                    <HiOutlineChevronUp className="h-5 w-5 text-gray-500" /> : 
                    <HiOutlineChevronDown className="h-5 w-5 text-gray-500" />
                  }
                </div>
              </div>
              
              {expandedConversation === conversation.id && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-500">Last Message:</h4>
                    <p>{conversation.lastMessage}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      View Details
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
                      Send Message
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
} 