import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  SearchIcon, 
  RefreshCwIcon, 
  FileIcon, 
  PlusCircleIcon,
  FilterIcon,
  ChevronDownIcon,
  Trash2Icon
} from 'lucide-react';
import { 
  Input,
  Button,
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger,
  Card, 
  CardContent,
  Small,
  Muted,
  Flex,
  Container,
  Text
} from '@/components/ui';

interface LeadManagementControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  isLoading: boolean;
  fetchLeads: () => Promise<void>;
  uniqueStatuses: string[];
  uniqueSources: string[];
  isUploadingCSV: boolean;
  handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  openAddLeadDialog: () => void;
  handleBatchDeleteBySource: (source: string) => Promise<void>;
}

// Animation variants
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const LeadManagementControls: React.FC<LeadManagementControlsProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  isLoading,
  fetchLeads,
  uniqueStatuses,
  uniqueSources,
  isUploadingCSV,
  handleCSVUpload,
  openAddLeadDialog,
  handleBatchDeleteBySource
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      className="mb-6 w-full"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      style={{ width: '100%' }}
    >
      {/* Main Control Panel */}
      <Card className="mb-4 shadow-sm w-full" style={{ width: '100%' }}>
        <CardContent className="p-4 w-full">
          <Flex className="relative w-full">
            <Flex className="absolute inset-y-0 left-0 pl-3 items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-gray-400" />
            </Flex>
            <Input 
              placeholder="Search leads by name, phone, or email..." 
              className="pl-10 h-11 bg-gray-50 border border-gray-200 rounded-md w-full text-gray-800 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </Flex>
        </CardContent>
      </Card>
      
      {/* Filters and Actions Row */}
      <Flex wrap gap="md" align="center" justify="between">
        {/* Filters */}
        <Flex wrap gap="sm">
          <Flex className="bg-white border border-gray-200 rounded-lg items-center shadow-sm">
            <Flex align="center" className="px-3 py-2">
              <FilterIcon className="h-3.5 w-3.5 text-gray-500 mr-2" />
              <Small className="font-medium text-gray-600">Status:</Small>
            </Flex>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className="border-0 bg-transparent h-8 text-sm text-gray-800 min-w-[120px] px-2 mx-1 focus:ring-0 focus:ring-offset-0 rounded-md"
                style={{ boxShadow: 'none' }}
              >
                <SelectValue placeholder="All Statuses" />
                <ChevronDownIcon className="h-4 w-4 ml-2 opacity-50" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectGroup>
                  <SelectItem value="all" className="text-gray-800">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status} className="text-gray-800">{status}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Flex>
          
          <Flex className="bg-white border border-gray-200 rounded-lg items-center shadow-sm">
            <Flex align="center" className="px-3 py-2">
              <FilterIcon className="h-3.5 w-3.5 text-gray-500 mr-2" />
              <Small className="font-medium text-gray-600">Source:</Small>
            </Flex>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger 
                className="border-0 bg-transparent h-8 text-sm text-gray-800 min-w-[120px] px-2 mx-1 focus:ring-0 focus:ring-offset-0 rounded-md"
                style={{ boxShadow: 'none' }}
              >
                <SelectValue placeholder="All Sources" />
                <ChevronDownIcon className="h-4 w-4 ml-2 opacity-50" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectGroup>
                  <SelectItem value="all" className="text-gray-800">All Sources</SelectItem>
                  {uniqueSources.map(source => (
                    <SelectItem key={source} value={source} className="text-gray-800">{source}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {sourceFilter !== 'all' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleBatchDeleteBySource(sourceFilter)}
                      className="h-8 w-8 mx-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete all leads from ${sourceFilter}`}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Small>Delete all leads from {sourceFilter}</Small>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Flex>
        </Flex>
        
        {/* Actions */}
        <Flex align="center" gap="sm">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLeads}
            disabled={isLoading}
            className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
            <Text className="text-gray-700">Refresh</Text>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingCSV}
            className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <FileIcon className="h-3.5 w-3.5 mr-1.5" />
            <Text className="text-gray-700">Upload CSV</Text>
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCSVUpload} 
            accept=".csv" 
            className="hidden" 
          />
          
          <Button 
            variant="default"
            size="sm"
            onClick={openAddLeadDialog}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            <PlusCircleIcon className="h-3.5 w-3.5 mr-1.5" />
            <Text className="text-white">Add Lead</Text>
          </Button>
        </Flex>
      </Flex>
    </motion.div>
  );
};

export default LeadManagementControls; 