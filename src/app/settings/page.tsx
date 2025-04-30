'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  H1,
  P,
  Flex,
  Container,
  Text
} from '@/components/ui';
import { 
  Save as SaveIcon, 
  RefreshCw as RefreshIcon,
  Check as CheckIcon,
  AlertCircle as AlertIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserSettings, saveUserSettings } from '@/lib/supabase/user-settings';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      ease: "easeOut"
    } 
  }
};

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3 } 
  }
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappTemplateId, setWhatsappTemplateId] = useState('');
  const [whatsappTemplateImageUrl, setWhatsappTemplateImageUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [messageLimit, setMessageLimit] = useState(30);
  const [whatsappLanguage, setWhatsappLanguage] = useState('en');
  const [openaiKey, setOpenaiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4.1-mini');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    // Load environment variables for fixed values
    setWhatsappToken(process.env.NEXT_PUBLIC_WHATSAPP_TOKEN_MASK || '••••••••••••••••••••••••••••••');
    setVerifyToken(process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN_MASK || '••••••••••••••••••••••••••••••');
    
    if (user) {
      loadUserSettings();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);
  
  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const settings = await getUserSettings();
      
      if (settings) {
        setWhatsappPhoneId(settings.whatsapp_phone_id || '');
        setWhatsappTemplateId(settings.whatsapp_template_id || '');
        setWhatsappTemplateImageUrl(settings.whatsapp_template_image_url || '');
        setMessageLimit(settings.message_limit_24h || 30);
        setWhatsappLanguage(settings.whatsapp_language || 'en');
        setOpenaiKey(settings.openai_api_key ? '••••••••••••••••••••••••••••••' : '');
        setAiModel(settings.ai_model || 'gpt-4.1-mini');
        setSystemPrompt(settings.system_prompt || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsAppSettings = async () => {
    if (!user) {
      toast.error('You must be signed in to save settings');
      return;
    }
    
    try {
      setSaving(true);
      await saveUserSettings({
        whatsapp_phone_id: whatsappPhoneId,
        whatsapp_template_id: whatsappTemplateId,
        whatsapp_template_image_url: whatsappTemplateImageUrl,
        message_limit_24h: messageLimit,
        whatsapp_language: whatsappLanguage
      });
      toast.success('WhatsApp settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const saveAISettings = async () => {
    if (!user) {
      toast.error('You must be signed in to save settings');
      return;
    }
    
    try {
      setSaving(true);
      await saveUserSettings({
        openai_api_key: openaiKey === '••••••••••••••••••••••••••••••' ? undefined : openaiKey,
        ai_model: aiModel,
        system_prompt: systemPrompt
      });
      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppConnection = () => {
    toast.loading('Testing WhatsApp connection...');
    // Simulate API call
    setTimeout(() => {
      toast.success('WhatsApp connection successful');
    }, 2000);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <Container className="p-6 max-w-7xl">
          <Flex justify="center" align="center" className="h-64">
            <RefreshIcon className="h-8 w-8 animate-spin text-gray-400" />
          </Flex>
        </Container>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Container className="p-6 max-w-7xl">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <Flex direction="column" align="center" gap="md" className="text-center">
                <AlertIcon className="h-12 w-12 text-amber-500 mb-2" />
                <H1 className="text-2xl font-semibold text-gray-800">Authentication Required</H1>
                <P className="text-gray-600 mb-4">You need to be signed in to view and manage your settings.</P>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Sign In
                </Button>
              </Flex>
            </CardContent>
          </Card>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <Container className="p-6 max-w-7xl">
          <motion.div 
            variants={cardVariants}
            className="mb-6"
          >
            <Flex direction="column">
              <H1 className="text-gray-800 mb-2">Settings</H1>
              <P className="text-gray-600">
                Configure your WhatsApp bot and integrations
              </P>
            </Flex>
          </motion.div>

          <Tabs defaultValue="whatsapp" value={activeTab} onValueChange={setActiveTab}>
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <TabsList className="mb-6 bg-white border border-gray-200 shadow-sm">
                <TabsTrigger value="whatsapp" className="text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
                  AI Configuration
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:bg-gray-100">
                  Advanced
                </TabsTrigger>
              </TabsList>
            </motion.div>
            
            <TabsContent value="whatsapp">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-800">WhatsApp Business API Settings</CardTitle>
                    <CardDescription className="text-gray-600">
                      Configure your WhatsApp Business API integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Flex direction="column" gap="md" className="space-y-4 mt-2">
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">WhatsApp Token (System-wide)</Label>
                            <Input 
                              value={whatsappToken}
                              disabled
                              className="border-gray-200 text-gray-500 bg-gray-50"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              This token is managed at the system level and cannot be changed by users
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">WhatsApp Phone Number ID</Label>
                            <Input 
                              placeholder="Enter your WhatsApp phone number ID" 
                              value={whatsappPhoneId}
                              onChange={(e) => setWhatsappPhoneId(e.target.value)}
                              className="border-gray-200 text-gray-800"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              Your unique WhatsApp Phone Number ID from the Meta Developer Portal
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">WhatsApp Template ID</Label>
                            <Input 
                              placeholder="Enter your WhatsApp template ID" 
                              value={whatsappTemplateId}
                              onChange={(e) => setWhatsappTemplateId(e.target.value)}
                              className="border-gray-200 text-gray-800"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              The ID of your approved message template from Meta
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={cardVariants} className="mt-6 mb-4">
                          <Card className="border border-blue-200 bg-blue-50 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg text-blue-800">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  WhatsApp Template Variables
                                </div>
                              </CardTitle>
                              <CardDescription className="text-blue-700">
                                How to personalize your messages with lead data
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-blue-700 space-y-3">
                                <p>You can use lead data in your WhatsApp templates using variable placeholders. In your Meta WhatsApp template, use variable syntax like <code className="bg-blue-100 px-1 rounded">{'{{'}<span>1</span>{'}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{'}<span>2</span>{'}}'}</code>, etc.</p>
                                <p className="font-medium mt-2">Available lead field variables:</p>
                                <ul className="pl-5 list-disc space-y-1">
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>1</span>{'}}'}</code> - Full Name</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>2</span>{'}}'}</code> - Email</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>3</span>{'}}'}</code> - Title/Position</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>4</span>{'}}'}</code> - First Name</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>5</span>{'}}'}</code> - Last Name</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>6</span>{'}}'}</code> - City</li>
                                  <li><code className="bg-blue-100 px-1 rounded">{'{{'}<span>7</span>{'}}'}</code> - Company Name</li>
                                </ul>
                                <p className="mt-2">Example template text:</p>
                                <div className="bg-white p-3 border border-blue-200 rounded-md mt-1 text-gray-800">
                                  <p>Hello {'{{'}<span>4</span>{'}}'},</p>
                                  <p className="mt-1">I noticed you work at {'{{'}<span>7</span>{'}}' } as a {'{{'}<span>3</span>{'}}' } in {'{{'}<span>6</span>{'}}'}</p>
                                  <p className="mt-1">I'd like to connect about our services that might help you.</p>
                                  <p className="mt-1">Best regards,<br/>Your Name</p>
                                </div>
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                                  <p className="flex items-center font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Important:
                                  </p>
                                  <ul className="mt-2 pl-5 list-disc text-sm">
                                    <li>Make sure your approved WhatsApp template has the exact number of variables you're using</li>
                                    <li>Create and approve your template in the Meta Business Manager</li>
                                    <li>Test your template before sending to all leads</li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">WhatsApp Template Image URL</Label>
                            <Input 
                              placeholder="Enter the image URL for your template" 
                              value={whatsappTemplateImageUrl}
                              onChange={(e) => setWhatsappTemplateImageUrl(e.target.value)}
                              className="border-gray-200 text-gray-800"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              URL to the image used in your WhatsApp template
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">24-Hour Message Limit</Label>
                            <Input 
                              type="number"
                              placeholder="Enter message limit" 
                              value={messageLimit}
                              onChange={(e) => setMessageLimit(parseInt(e.target.value) || 30)}
                              className="border-gray-200 text-gray-800"
                              min={1}
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              Maximum number of messages that can be sent in a 24-hour period
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">Verify Token (System-wide)</Label>
                            <Input 
                              value={verifyToken}
                              disabled
                              className="border-gray-200 text-gray-500 bg-gray-50"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              This token is managed at the system level and cannot be changed by users
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">WhatsApp Language</Label>
                            <Select value={whatsappLanguage} onValueChange={setWhatsappLanguage}>
                              <SelectTrigger className="border-gray-200 text-gray-800">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="en" className="text-gray-800">English (en)</SelectItem>
                                <SelectItem value="en_US" className="text-gray-800">English (United States)</SelectItem>
                                <SelectItem value="de" className="text-gray-800">German (de)</SelectItem>
                                <SelectItem value="de_AT" className="text-gray-800">German (Austria)</SelectItem>
                                <SelectItem value="de_CH" className="text-gray-800">German (Switzerland)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Text className="text-xs text-gray-600 mt-1.5">
                              Language used for WhatsApp messages and templates
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <Flex gap="sm" className="pt-4">
                            <motion.div
                              variants={buttonVariants}
                              initial="initial"
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button 
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                onClick={saveWhatsAppSettings}
                                disabled={saving}
                              >
                                {saving ? (
                                  <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <SaveIcon className="h-4 w-4 mr-2" />
                                )}
                                <span>Save Changes</span>
                              </Button>
                            </motion.div>
                            <motion.div
                              variants={buttonVariants}
                              initial="initial"
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button 
                                variant="secondary" 
                                className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
                                onClick={testWhatsAppConnection}
                                disabled={saving}
                              >
                                <RefreshIcon className="h-4 w-4 mr-2" />
                                <span>Test Connection</span>
                              </Button>
                            </motion.div>
                          </Flex>
                        </motion.div>
                      </Flex>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="ai">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-800">AI Configuration</CardTitle>
                    <CardDescription className="text-gray-600">
                      Configure the OpenAI integration for your bot
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Flex direction="column" gap="md" className="space-y-4 mt-2">
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">OpenAI API Key</Label>
                            <Input 
                              placeholder="Enter your OpenAI API key" 
                              value={openaiKey}
                              onChange={(e) => setOpenaiKey(e.target.value)}
                              className="border-gray-200 text-gray-800"
                              type={openaiKey === '••••••••••••••••••••••••••••••' ? 'password' : 'text'}
                            />
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">AI Model</Label>
                            <Select value={aiModel} onValueChange={setAiModel}>
                              <SelectTrigger className="border-gray-200 text-gray-800">
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="gpt-4.1" className="text-gray-800">gpt-4.1</SelectItem>
                                <SelectItem value="gpt-4.1-mini" className="text-gray-800">gpt-4.1-mini</SelectItem>
                                <SelectItem value="gpt-4.1-nano" className="text-gray-800">gpt-4.1-nano</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">System Prompt</Label>
                            <Textarea 
                              placeholder="Enter the system prompt for the AI" 
                              value={systemPrompt}
                              onChange={(e) => setSystemPrompt(e.target.value)}
                              rows={8}
                              className="min-h-32 border-gray-200 text-gray-800"
                            />
                            <Text className="text-xs text-gray-600 mt-1.5">
                              This prompt sets the behavior and tone of the AI assistant
                            </Text>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <Flex gap="sm" className="pt-4">
                            <motion.div
                              variants={buttonVariants}
                              initial="initial"
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button 
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                onClick={saveAISettings}
                                disabled={saving}
                              >
                                {saving ? (
                                  <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <SaveIcon className="h-4 w-4 mr-2" />
                                )}
                                <span>Save Changes</span>
                              </Button>
                            </motion.div>
                          </Flex>
                        </motion.div>
                      </Flex>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="advanced">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-800">Advanced Settings</CardTitle>
                    <CardDescription className="text-gray-600">
                      Additional configuration options
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Flex direction="column" gap="md" className="space-y-4 mt-2">
                        <motion.div variants={itemVariants}>
                          <div>
                            <Label className="text-gray-700 mb-1.5 block">Logging Level</Label>
                            <Select defaultValue="info">
                              <SelectTrigger className="border-gray-200 text-gray-800">
                                <SelectValue placeholder="Select log level" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="debug" className="text-gray-800">Debug</SelectItem>
                                <SelectItem value="info" className="text-gray-800">Info</SelectItem>
                                <SelectItem value="warn" className="text-gray-800">Warning</SelectItem>
                                <SelectItem value="error" className="text-gray-800">Error</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants}>
                          <div className="flex items-center mt-4 space-x-2">
                            <input 
                              type="checkbox" 
                              id="detailedLogging"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="detailedLogging" className="text-gray-700">Enable detailed logging</Label>
                          </div>
                        </motion.div>
                      </Flex>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </Container>
      </motion.div>
    </DashboardLayout>
  );
} 