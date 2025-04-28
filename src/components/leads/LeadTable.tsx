import React, { useState } from 'react';
import { Trash2, PenLine, PhoneOutgoing, ChevronDown, ChevronUp, Building, Map, User } from 'lucide-react';
import {
  Flex,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
  Badge,
  Muted,
  Card,
  CardContent
} from '@/components/ui';
import { Lead } from '@/types/leads';
import Link from 'next/link';

interface LeadTableProps {
  leads: Lead[];
  filteredLeads: Lead[];
  isLoading: boolean;
  searchQuery: string;
  handleDeleteLead: (id: string) => Promise<void>;
  fetchLeads: () => Promise<void>;
}

const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  filteredLeads,
  isLoading,
  searchQuery,
  handleDeleteLead,
  fetchLeads
}) => {
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Function to handle opening delete confirmation dialog
  const handleConfirmDelete = (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Function to handle actual deletion after confirmation
  const confirmDelete = async () => {
    if (leadToDelete) {
      await handleDeleteLead(leadToDelete);
      setLeadToDelete(null);
      setDeleteDialogOpen(false);
      await fetchLeads();
    }
  };

  // Helper function to format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  // Function to toggle row expansion
  const toggleRowExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Check if lead has additional details
  const hasAdditionalDetails = (lead: Lead) => {
    return lead.title || lead.first_name || lead.last_name || lead.city || lead.company_name;
  };

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Name</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Phone</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Created Date</th>
            <th className="text-right py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="py-8 text-center">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                </div>
                <div className="mt-2 text-sm text-gray-500">Loading leads...</div>
              </td>
            </tr>
          ) : filteredLeads.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center">
                {searchQuery ? (
                  <div className="text-gray-500">
                    <div className="text-lg font-medium">No matching leads found</div>
                    <div className="mt-1 text-sm">Try adjusting your search query</div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <div className="text-lg font-medium">No leads found</div>
                    <div className="mt-1 text-sm">Get started by adding your first lead</div>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            filteredLeads.map((lead) => (
              <React.Fragment key={lead.id}>
                <tr 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Flex align="center" gap="sm">
                      <div className="h-9 w-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Text className="font-medium text-gray-800">{lead.name}</Text>
                        <Muted className="text-xs">{lead.email}</Muted>
                      </div>
                      {hasAdditionalDetails(lead) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRowExpand(lead.id);
                          }}
                        >
                          {expandedRow === lead.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </Button>
                      )}
                    </Flex>
                  </td>
                  <td className="py-3 px-4">
                    <Text className="text-gray-800">{lead.phone}</Text>
                  </td>
                  <td className="py-3 px-4">
                    <Badge 
                      className={`${
                        lead.status === 'New Lead' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                        lead.status === 'Converted' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Text className="text-gray-800">
                      {formatDate(lead.created_at)}
                    </Text>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Link href={`/leads/${lead.id}/edit`} passHref>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                          aria-label="Edit lead"
                        >
                          <PenLine size={16} />
                        </Button>
                      </Link>
                      
                      <Link href={`tel:${lead.phone}`} passHref>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                          aria-label="Call lead"
                        >
                          <PhoneOutgoing size={16} />
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity text-red-600"
                        aria-label="Delete lead"
                        onClick={() => handleConfirmDelete(lead.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Expanded details row */}
                {expandedRow === lead.id && hasAdditionalDetails(lead) && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td colSpan={5} className="py-2 px-4">
                      <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="p-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(lead.first_name || lead.last_name) && (
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-500" />
                                <div>
                                  <Text className="text-sm text-gray-500">Full Name</Text>
                                  <Text className="text-sm font-medium">
                                    {[lead.title, lead.first_name, lead.last_name]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </Text>
                                </div>
                              </div>
                            )}
                            
                            {lead.company_name && (
                              <div className="flex items-center gap-2">
                                <Building size={16} className="text-gray-500" />
                                <div>
                                  <Text className="text-sm text-gray-500">Company</Text>
                                  <Text className="text-sm font-medium">{lead.company_name}</Text>
                                </div>
                              </div>
                            )}
                            
                            {lead.city && (
                              <div className="flex items-center gap-2">
                                <Map size={16} className="text-gray-500" />
                                <div>
                                  <Text className="text-sm text-gray-500">City</Text>
                                  <Text className="text-sm font-medium">{lead.city}</Text>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the lead and remove their data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadTable; 