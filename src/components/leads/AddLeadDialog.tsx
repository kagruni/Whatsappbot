import React, { useState } from 'react';
import { PlusCircleIcon } from 'lucide-react';
import { 
  Button,
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  Input,
  Label,
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Small,
  Flex,
  Container,
  Text
} from '@/components/ui';
import { toast } from 'sonner';

interface AddLeadDialogProps {
  onLeadAdded: () => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const AddLeadDialog: React.FC<AddLeadDialogProps> = ({ 
  onLeadAdded,
  isOpen,
  setIsOpen
}) => {
  // If isOpen and setIsOpen are not provided, manage state internally
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'WhatsApp'
  });

  // Use the external state if provided, otherwise use internal state
  const dialogOpen = isOpen !== undefined ? isOpen : internalOpen;
  const setDialogOpen = setIsOpen || setInternalOpen;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSourceChange = (value: string) => {
    setFormData(prev => ({ ...prev, source: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.phone) {
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
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          source: formData.source,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add lead');
      }
      
      toast.success('Lead added successfully');
      setFormData({ name: '', phone: '', email: '', source: 'WhatsApp' });
      setDialogOpen(false);
      onLeadAdded(); // Callback to refresh leads
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast.error(error.message || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {/* Only render the trigger if we're using internal state management */}
      {setIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            <Small className="hidden sm:inline text-white">Add Lead</Small>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-gray-800">Add New Lead</DialogTitle>
          <DialogDescription className="text-gray-500">
            Fill in the details to add a new lead to your system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Container className="grid gap-4 py-4" padding="none">
            <Flex direction="row" align="center" gap="md" className="grid-cols-4">
              <Label htmlFor="name" className="text-right text-gray-700">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full Name"
                className="col-span-3 border-gray-200 text-gray-800"
                required
              />
            </Flex>
            <Flex direction="row" align="center" gap="md" className="grid-cols-4">
              <Label htmlFor="phone" className="text-right text-gray-700">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1234567890"
                className="col-span-3 border-gray-200 text-gray-800"
                required
              />
            </Flex>
            <Flex direction="row" align="center" gap="md" className="grid-cols-4">
              <Label htmlFor="email" className="text-right text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                className="col-span-3 border-gray-200 text-gray-800"
              />
            </Flex>
            <Flex direction="row" align="center" gap="md" className="grid-cols-4">
              <Label htmlFor="source" className="text-right text-gray-700">
                Source
              </Label>
              <Flex direction="column" className="col-span-3">
                <Select
                  name="source" 
                  value={formData.source} 
                  onValueChange={handleSourceChange}
                >
                  <SelectTrigger className="border-gray-200 text-gray-800">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Flex>
            </Flex>
          </Container>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Text className="text-white">{isSubmitting ? "Adding..." : "Add Lead"}</Text>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog; 