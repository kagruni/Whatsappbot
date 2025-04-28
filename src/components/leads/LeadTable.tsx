import React, { useState } from 'react';
import { Trash2, PenLine, PhoneOutgoing } from 'lucide-react';
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
  Muted
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
              <tr 
                key={lead.id} 
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
                  </Flex>
                </td>
                <td className="py-3 px-4">
                  <Text className="text-gray-800">{lead.phone}</Text>
                </td>
                <td className="py-3 px-4">
                  <Badge 
                    className={`${
                      lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
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