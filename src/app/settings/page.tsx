'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, Title, Text, Button, TextInput, Textarea, Select, SelectItem, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react';
import { HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  
  // Mock settings
  const [whatsappToken, setWhatsappToken] = useState('••••••••••••••••••••••••••••••');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('1234567890123456');
  const [verifyToken, setVerifyToken] = useState('custom_verify_token_123');
  
  const [openaiKey, setOpenaiKey] = useState('••••••••••••••••••••••••••••••');
  const [aiModel, setAiModel] = useState('gpt-3.5-turbo');
  const [systemPrompt, setSystemPrompt] = useState(`You are an AI assistant for a WhatsApp business account. Your role is to:
1. Provide helpful and concise information about the company's products and services.
2. Answer customer queries politely and professionally.
3. Escalate complex issues to human support when necessary.
4. Understand and respond to specific commands like 'help', 'products', or 'contact'.
Always maintain a friendly and professional tone.`);

  const [trelloApiKey, setTrelloApiKey] = useState('••••••••••••••••••••••••••••••');
  const [trelloToken, setTrelloToken] = useState('••••••••••••••••••••••••••••••');
  const [trelloBoardId, setTrelloBoardId] = useState('abc123def456');

  const saveWhatsAppSettings = () => {
    // In a real application, this would send the data to your backend
    toast.success('WhatsApp settings saved successfully');
  };
  
  const saveAISettings = () => {
    toast.success('AI settings saved successfully');
  };
  
  const saveTrelloSettings = () => {
    toast.success('Trello settings saved successfully');
  };

  const testWhatsAppConnection = () => {
    toast.loading('Testing WhatsApp connection...');
    // Simulate API call
    setTimeout(() => {
      toast.success('WhatsApp connection successful');
    }, 2000);
  };
  
  const testTrelloConnection = () => {
    toast.loading('Testing Trello connection...');
    // Simulate API call
    setTimeout(() => {
      toast.success('Trello connection successful');
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">
          Configure your WhatsApp bot and integrations
        </p>
      </div>

      <TabGroup index={activeTab} onIndexChange={setActiveTab}>
        <TabList className="mb-6">
          <Tab>WhatsApp</Tab>
          <Tab>AI Configuration</Tab>
          <Tab>Trello Integration</Tab>
          <Tab>Advanced</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Card>
              <Title>WhatsApp Business API Settings</Title>
              <Text className="mb-4">Configure your WhatsApp Business API integration</Text>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Token</label>
                  <TextInput 
                    placeholder="Enter your WhatsApp API token" 
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone Number ID</label>
                  <TextInput 
                    placeholder="Enter your WhatsApp phone number ID" 
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
                  <TextInput 
                    placeholder="Enter your custom verify token" 
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    This token is used to verify your webhook URL with the WhatsApp API
                  </Text>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    icon={HiOutlineSave}
                    onClick={saveWhatsAppSettings}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="secondary" 
                    icon={HiOutlineRefresh}
                    onClick={testWhatsAppConnection}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <Title>AI Configuration</Title>
              <Text className="mb-4">Configure the OpenAI integration for your bot</Text>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                  <TextInput 
                    placeholder="Enter your OpenAI API key" 
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                  <Select
                    value={aiModel}
                    onValueChange={setAiModel}
                  >
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                  <Textarea 
                    placeholder="Enter the system prompt for the AI" 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={8}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    This prompt sets the behavior and tone of the AI assistant
                  </Text>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    icon={HiOutlineSave}
                    onClick={saveAISettings}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <Title>Trello Integration</Title>
              <Text className="mb-4">Configure the Trello integration for lead management</Text>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trello API Key</label>
                  <TextInput 
                    placeholder="Enter your Trello API key" 
                    value={trelloApiKey}
                    onChange={(e) => setTrelloApiKey(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trello Token</label>
                  <TextInput 
                    placeholder="Enter your Trello token" 
                    value={trelloToken}
                    onChange={(e) => setTrelloToken(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trello Board ID</label>
                  <TextInput 
                    placeholder="Enter your Trello board ID" 
                    value={trelloBoardId}
                    onChange={(e) => setTrelloBoardId(e.target.value)}
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    icon={HiOutlineSave}
                    onClick={saveTrelloSettings}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="secondary" 
                    icon={HiOutlineRefresh}
                    onClick={testTrelloConnection}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <Title>Advanced Settings</Title>
              <Text className="mb-4">Additional configuration options</Text>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logging Level</label>
                  <Select defaultValue="info">
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </Select>
                </div>
                
                <div className="flex items-center mt-4">
                  <input 
                    id="auto-sync" 
                    type="checkbox" 
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label htmlFor="auto-sync" className="ml-2 block text-sm text-gray-700">
                    Automatically sync leads with Trello
                  </label>
                </div>
                
                <div className="flex items-center mt-2">
                  <input 
                    id="notifications" 
                    type="checkbox" 
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                    Enable email notifications
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button icon={HiOutlineSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </DashboardLayout>
  );
} 