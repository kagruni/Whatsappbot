import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLinkIcon, 
  TrashIcon,
  CalendarIcon,
  SmartphoneIcon,
  MailIcon,
  FileIcon,
  RefreshCwIcon
} from 'lucide-react';
import { 
  Button,
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Skeleton,
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger,
  Badge,
  Small, 
  P, 
  Muted,
  Flex,
  Container,
  Text
} from '@/components/ui';
import { Lead } from '@/types/leads';

// Props interface
interface LeadTableProps {
  leads: Lead[];
  filteredLeads: Lead[];
  isLoading: boolean;
  searchQuery: string;
  handleDeleteLead: (id: string) => Promise<void>;
  fetchLeads: () => Promise<void>;
}

// Animation variants
const tableRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const MotionTableRow = motion(TableRow);

const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  filteredLeads,
  isLoading,
  searchQuery,
  handleDeleteLead,
  fetchLeads
}) => {
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
    <Container className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm" padding="none">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-gray-200">
            <TableHead className="py-3 text-xs font-semibold text-gray-600">Name</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-gray-600">Contact</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-gray-600">Status</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-gray-600">Source</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-gray-600">Date Added</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index} className="border-b border-gray-100">
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
              <TableCell colSpan={6}>
                <motion.div 
                  className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 rounded-lg m-4"
                  variants={emptyStateVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FileIcon className="w-12 h-12 text-gray-400 mb-4" />
                  <P className="text-xl font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No leads match your search' : 'No leads found'}
                  </P>
                  <P className="text-gray-700 max-w-md mb-6">
                    {searchQuery 
                      ? 'Try using different search terms or clearing your filters' 
                      : 'Add your first lead to get started with lead management'}
                  </P>
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={fetchLeads}
                    className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
                  >
                    <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-gray-700">Refresh</span>
                  </Button>
                </motion.div>
              </TableCell>
            </TableRow>
          ) : (
            filteredLeads.map((lead) => (
              <MotionTableRow
                key={lead.id}
                variants={tableRowVariants}
                initial="hidden"
                animate="visible"
                className="group border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <TableCell className="py-3 font-medium text-gray-900">{lead.name}</TableCell>
                <TableCell className="py-3">
                  <Flex direction="column" gap="xs">
                    <Flex align="center" gap="xs">
                      <SmartphoneIcon className="h-3 w-3 text-gray-500" />
                      <Small className="text-gray-700">{lead.phone}</Small>
                    </Flex>
                    {lead.email && (
                      <Flex align="center" gap="xs" className="mt-1">
                        <MailIcon className="h-3 w-3 text-gray-400" />
                        <Muted>{lead.email}</Muted>
                      </Flex>
                    )}
                  </Flex>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={getStatusBadgeVariant(lead.status)}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <Small className="text-gray-700">{lead.source}</Small>
                </TableCell>
                <TableCell className="py-3">
                  <Flex align="center" gap="xs">
                    <CalendarIcon className="h-3 w-3 text-gray-500" />
                    <Small className="text-gray-700">{new Date(lead.created_at).toLocaleDateString()}</Small>
                  </Flex>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <Flex justify="end" gap="xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            tabIndex={0}
                            aria-label="View lead details"
                            onClick={() => {/* View lead details */}}
                            onKeyDown={(e) => e.key === 'Enter' && {/* View lead details */}}
                            className="h-7 w-7 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <P className="text-gray-800">View lead details</P>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                            tabIndex={0}
                            aria-label="Delete lead"
                            onClick={() => handleDeleteLead(lead.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDeleteLead(lead.id)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <P className="text-gray-800">Delete lead</P>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Flex>
                </TableCell>
              </MotionTableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Container>
  );
};

export default LeadTable; 