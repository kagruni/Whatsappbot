import React from 'react';
import { DownloadIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  Button,
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger,
  Badge,
  Small, 
  P, 
  Muted,
  Flex,
  Text
} from '@/components/ui';
import LeadTable from './LeadTable';
import { Lead } from '@/types/leads';

interface LeadTableCardProps {
  leads: Lead[];
  filteredLeads: Lead[];
  isLoading: boolean;
  searchQuery: string;
  handleDeleteLead: (id: string) => Promise<void>;
  fetchLeads: () => Promise<void>;
}

const LeadTableCard: React.FC<LeadTableCardProps> = ({
  leads,
  filteredLeads,
  isLoading,
  searchQuery,
  handleDeleteLead,
  fetchLeads
}) => {
  // Function to handle export (could be implemented to export to CSV)
  const handleExport = () => {
    // This would be implemented to actually export data
    alert('Export functionality would go here');
  };

  return (
    <Card className="border border-gray-200 rounded-xl w-full" style={{ 
      width: '100%', 
      margin: 0, 
      padding: 0, 
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <CardHeader className="bg-white border-b border-gray-100" style={{ 
        width: '100%', 
        padding: '16px 20px', 
        boxSizing: 'border-box' 
      }}>
        <Flex direction="column" className="sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
          <Flex direction="column">
            <CardTitle className="text-gray-800 flex items-center">
              Your Leads 
              <Badge variant="default" className="ml-2 bg-blue-600 hover:bg-blue-700">
                {filteredLeads.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-500">
              Manage and track all your customer leads
            </CardDescription>
          </Flex>
        </Flex>
      </CardHeader>
      <div className="w-full overflow-auto bg-white" style={{ 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>
        <LeadTable 
          leads={leads}
          filteredLeads={filteredLeads}
          isLoading={isLoading}
          searchQuery={searchQuery}
          handleDeleteLead={handleDeleteLead}
          fetchLeads={fetchLeads}
        />
      </div>
      <CardFooter className="justify-between border-t border-gray-100 bg-gray-50" style={{ 
        padding: '12px 20px', 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>
        <Text className="text-sm font-medium text-gray-700">
          Showing {filteredLeads.length} of {leads.length} leads
        </Text>
        <Flex align="center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  aria-label="Export leads"
                  className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
                >
                  <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-gray-700">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <P className="text-gray-800">Export leads to CSV</P>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Flex>
      </CardFooter>
    </Card>
  );
};

export default LeadTableCard; 