import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Card,
  CardContent,
  Flex,
  Small,
  Text,
} from '@/components/ui';
import { AlertCircleIcon, CheckCircleIcon, HelpCircleIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface CSVColumnMapperProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  csvHeaders: string[];
  onColumnsMapConfirm: (mapping: Record<string, string>) => void;
  isProcessing: boolean;
}

const defaultRequiredFields = [
  { name: 'phone', label: 'Phone Number', required: true },
];

const optionalFields = [
  { name: 'name', label: 'Name (Full Name)', required: false },
  { name: 'email', label: 'Email', required: false },
  { name: 'title', label: 'Title', required: false },
  { name: 'first_name', label: 'First Name', required: false },
  { name: 'last_name', label: 'Last Name', required: false },
  { name: 'city', label: 'City', required: false },
  { name: 'company_name', label: 'Company Name', required: false },
];

const allFields = [...defaultRequiredFields, ...optionalFields];

const CSVColumnMapper: React.FC<CSVColumnMapperProps> = ({
  isOpen,
  setIsOpen,
  csvHeaders,
  onColumnsMapConfirm,
  isProcessing
}) => {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize with likely matches based on header names
  useEffect(() => {
    if (csvHeaders.length > 0 && Object.keys(columnMapping).length === 0) {
      const initialMapping: Record<string, string> = {};
      
      allFields.forEach(field => {
        // Try to find exact match first
        const exactMatch = csvHeaders.find(
          header => header.toLowerCase() === field.name.toLowerCase()
        );
        
        if (exactMatch) {
          initialMapping[field.name] = exactMatch;
          return;
        }
        
        // Try to find partial match
        const partialMatch = csvHeaders.find(
          header => header.toLowerCase().includes(field.name.toLowerCase())
        );
        
        if (partialMatch) {
          initialMapping[field.name] = partialMatch;
        }
      });
      
      setColumnMapping(initialMapping);
    }
  }, [csvHeaders]);

  const handleColumnChange = (fieldName: string, csvColumn: string) => {
    // If none is selected, remove the mapping for this field
    if (csvColumn === 'none') {
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        delete newMapping[fieldName];
        return newMapping;
      });
    } else {
      setColumnMapping(prev => ({
        ...prev,
        [fieldName]: csvColumn
      }));
    }
    
    // Clear error if set
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateMapping = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    // Check required fields
    defaultRequiredFields.forEach(field => {
      if (!columnMapping[field.name]) {
        newErrors[field.name] = `${field.label} mapping is required`;
        isValid = false;
      }
    });
    
    // Check for duplicate mappings
    const usedColumns = Object.values(columnMapping).filter(Boolean);
    const duplicates = usedColumns.filter(
      (column, index) => usedColumns.indexOf(column) !== index
    );
    
    if (duplicates.length > 0) {
      duplicates.forEach(duplicate => {
        const fieldNames = Object.entries(columnMapping)
          .filter(([_, column]) => column === duplicate)
          .map(([fieldName, _]) => fieldName);
        
        fieldNames.forEach(fieldName => {
          newErrors[fieldName] = `Column "${duplicate}" is mapped to multiple fields`;
        });
      });
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleConfirm = () => {
    if (validateMapping()) {
      onColumnsMapConfirm(columnMapping);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Map CSV Columns to Lead Fields</DialogTitle>
          <DialogDescription className="text-gray-300">
            Match your CSV columns to the corresponding lead fields. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto p-1">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="space-y-4"
          >
            <Card className="border border-blue-100 bg-blue-900 bg-opacity-30">
              <CardContent className="p-3">
                <Flex align="center" gap="sm">
                  <HelpCircleIcon className="h-5 w-5 text-blue-300" />
                  <Text className="text-blue-100 text-sm">
                    Select which CSV column corresponds to each lead field. Only Phone Number is required.
                  </Text>
                </Flex>
              </CardContent>
            </Card>

            {/* Required Fields Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Required Fields</h3>
              {defaultRequiredFields.map(field => (
                <div key={field.name} className="grid grid-cols-2 items-center gap-4">
                  <label htmlFor={`field-${field.name}`} className="flex items-center">
                    <span className="font-medium text-white">{field.label}</span>
                    <span className="text-red-300 ml-1">*</span>
                  </label>
                  <div>
                    <Select
                      value={columnMapping[field.name] || 'none'}
                      onValueChange={(value) => handleColumnChange(field.name, value)}
                    >
                      <SelectTrigger
                        id={`field-${field.name}`}
                        className={`w-full ${errors[field.name] ? 'border-red-500 ring-red-200' : ''}`}
                      >
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] bg-white">
                        <SelectItem value="none" className="text-black">-- None --</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header} className="text-black">
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[field.name] && (
                      <Small className="text-red-300 mt-1 flex items-center">
                        <AlertCircleIcon className="h-3 w-3 mr-1" />
                        {errors[field.name]}
                      </Small>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Optional Fields</h3>
              {optionalFields.map(field => (
                <div key={field.name} className="grid grid-cols-2 items-center gap-4">
                  <label htmlFor={`field-${field.name}`} className="flex items-center">
                    <span className="font-medium text-white">{field.label}</span>
                  </label>
                  <div>
                    <Select
                      value={columnMapping[field.name] || 'none'}
                      onValueChange={(value) => handleColumnChange(field.name, value)}
                    >
                      <SelectTrigger
                        id={`field-${field.name}`}
                        className={`w-full ${errors[field.name] ? 'border-red-500 ring-red-200' : ''}`}
                      >
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] bg-white">
                        <SelectItem value="none" className="text-black">-- None --</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header} className="text-black">
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[field.name] && (
                      <Small className="text-red-300 mt-1 flex items-center">
                        <AlertCircleIcon className="h-3 w-3 mr-1" />
                        {errors[field.name]}
                      </Small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-gray-600 text-white hover:bg-gray-700"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isProcessing ? 'Processing...' : (
              <Flex align="center" gap="xs">
                <CheckCircleIcon className="h-4 w-4" />
                <span>Confirm Mapping & Import</span>
              </Flex>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVColumnMapper; 