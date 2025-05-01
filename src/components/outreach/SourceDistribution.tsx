'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileIcon, UsersIcon, FileTextIcon, MessageSquareIcon, AlertTriangleIcon, CheckIcon, EyeIcon, ReplyIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Lead } from '@/types/leads';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { subscribeToStatusChanges, fetchMessageStatusData, type LeadStatusData } from '@/services/messageStatusService';

interface SourceData {
  source: string;
  count: number;
  color: string;
  contacted: number;
  failed: number;
  read: number;
  replied: number;
  inProgress: boolean;
}

interface UserSettings {
  whatsapp_template_id: string | null;
  message_limit_24h: number;
  whatsapp_language: string | null;
  whatsapp_phone_id: string | null;
  whatsapp_template_image_url: string | null;
}

// Add WhatsApp brand colors below color palette
const colors = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-orange-100 text-orange-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-800',
  'bg-indigo-100 text-indigo-800',
];

// WhatsApp brand colors
const WHATSAPP_GREEN = '#25D366';

// Function to normalize German phone numbers
function normalizeGermanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove leading zero(s) which are used in domestic German format
  normalized = normalized.replace(/^0+/, '');
  
  // If number doesn't already have the German country code, add it
  if (!normalized.startsWith('49')) {
    normalized = `49${normalized}`;
  }
  
  return normalized;
}

export default function SourceDistribution() {
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState<number>(0);
  const [messagesUsedToday, setMessagesUsedToday] = useState<number>(0);
  const [initiatingSource, setInitiatingSource] = useState<string | null>(null);
  const [templateLanguage, setTemplateLanguage] = useState<string | null>(null);
  const [whatsappPhoneId, setWhatsappPhoneId] = useState<string | null>(null);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const [lastStatusUpdate, setLastStatusUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLeadSourceData();
      fetchUserSettings();
      fetchMessageCount();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('whatsapp_template_id, message_limit_24h, whatsapp_language, whatsapp_phone_id, whatsapp_template_image_url')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      if (data) {
        setTemplateId(data.whatsapp_template_id);
        setMessageLimit(data.message_limit_24h || 0);
        setTemplateLanguage(data.whatsapp_language);
        setWhatsappPhoneId(data.whatsapp_phone_id);
        setTemplateImageUrl(data.whatsapp_template_image_url);
      }
    } catch (error: any) {
      console.error('Error in fetchUserSettings:', error);
    }
  };

  const fetchMessageCount = async () => {
    try {
      if (!user) return;

      // Get the start of the current day (midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Query conversations created in the last 24 hours with message_type = 'template'
      const { data, error } = await supabase
        .from('lead_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('message_type', 'template') // Only count template messages
        .gte('created_at', today.toISOString());

      if (error) {
        console.error('Error fetching conversation count:', error);
        return;
      }

      // Count the records in JavaScript
      const count = data ? data.length : 0;
      
      // Check if the count has reset (was higher before, now lower)
      if (count < messagesUsedToday) {
        console.log(`Daily message count reset detected: ${messagesUsedToday} → ${count}`);
        toast.info('Daily message limit has reset. You can continue contacting leads.', {
          id: 'daily-limit-reset',
          duration: 5000
        });
      }
      
      setMessagesUsedToday(count);
      
    } catch (error: any) {
      console.error('Error in fetchMessageCount:', error);
    }
  };

  const fetchLeadSourceData = async () => {
    setIsLoading(true);
    try {
      // Fetch leads from Supabase to get basic counts
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        // Group leads by source
        const leadsBySource: Record<string, Lead[]> = {};
        data.forEach((lead: Lead) => {
          if (lead.source) {
            if (!leadsBySource[lead.source]) {
              leadsBySource[lead.source] = [];
            }
            leadsBySource[lead.source].push(lead);
          }
        });
        
        // Directly fetch status data from lead_conversations table to get accurate read/reply counts
        const statusData = await fetchMessageStatusData(user?.id as string);
        
        // Transform into SourceData array with assigned colors and contact stats
        const sourceDataArray: SourceData[] = Object.entries(leadsBySource)
          .map(([source, leads], index) => {
            // Initialize counters
            let contacted = 0;
            let failed = 0;
            let read = 0;
            let replied = 0;
            
            // Count basic status info from lead status
            leads.forEach(lead => {
              if (lead.status === 'Contacted') {
                contacted++;
              } else if (lead.status === 'Replied') {
                contacted++;
                replied++;
              } else if (lead.status === 'Failed') {
                failed++;
              }
            });
            
            // Override with accurate read/reply counts from status data
            if (statusData && statusData[source]) {
              read = statusData[source].read;
              // For other counts, use the maximum
              replied = Math.max(replied, statusData[source].replied);
              contacted = Math.max(contacted, statusData[source].contacted);
              failed = Math.max(failed, statusData[source].failed);
            }
            
            return {
              source,
              count: leads.length,
              color: colors[index % colors.length],
              contacted,
              failed,
              read,
              replied,
              inProgress: false
            };
          })
          .sort((a, b) => b.count - a.count); // Sort by count descending

        setSourceData(sourceDataArray);
        setTotalLeads(data.length);
      }
    } catch (error: any) {
      console.error('Error fetching lead source data:', error);
      toast.error(`Failed to fetch lead sources: ${error.message}`);
      
      // Use mock data for development
      if (process.env.NODE_ENV === 'development') {
        const mockSourceData: SourceData[] = [
          { source: 'website_leads.csv', count: 42, color: colors[0], contacted: 25, failed: 3, read: 15, replied: 8, inProgress: false },
          { source: 'linkedin_campaign.csv', count: 28, color: colors[1], contacted: 15, failed: 2, read: 10, replied: 6, inProgress: false },
          { source: 'event_contacts.csv', count: 17, color: colors[2], contacted: 0, failed: 0, read: 0, replied: 0, inProgress: false },
          { source: 'partner_referrals.csv', count: 13, color: colors[3], contacted: 8, failed: 1, read: 5, replied: 3, inProgress: false },
        ];
        setSourceData(mockSourceData);
        setTotalLeads(100);
        toast.info('Using mock data for development');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a refresh timer to automatically update the data
  useEffect(() => {
    if (user) {
      // First do an immediate fetch
      fetchLeadSourceData();
      
      // Set up a refresh interval to update the data more frequently to catch status changes
      const refreshInterval = setInterval(() => {
        console.log("Auto-refreshing lead source data to check for status updates");
        fetchLeadSourceData();
      }, 10000); // 10 seconds instead of 30 for quicker status updates
      
      // Clean up the interval on component unmount
      return () => clearInterval(refreshInterval);
    }
  }, [user]);

  // Add a new useEffect for midnight refresh to reset daily limits
  useEffect(() => {
    if (user) {
      // Function to schedule the next midnight refresh
      const scheduleNextMidnightRefresh = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 5, 0); // 00:00:05 AM to ensure we're past midnight
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        console.log(`Scheduling message limit refresh in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes at midnight`);
        
        // Set timeout for midnight
        const midnightTimeout = setTimeout(() => {
          console.log("Midnight reached - refreshing message count and lead data");
          fetchMessageCount();
          fetchLeadSourceData();
          
          // Schedule for next day once completed
          scheduleNextMidnightRefresh();
        }, timeUntilMidnight);
        
        // Return cleanup function
        return () => clearTimeout(midnightTimeout);
      };
      
      // Start the scheduling cycle
      const clearScheduler = scheduleNextMidnightRefresh();
      
      // Clean up on component unmount
      return clearScheduler;
    }
  }, [user]);

  // Add a new useEffect for real-time updates
  useEffect(() => {
    if (user) {
      console.log("Setting up real-time subscription to message status changes");
      
      // Subscribe to status changes with real-time updates
      const unsubscribe = subscribeToStatusChanges(user.id, (statusData) => {
        console.log("Received real-time status update", statusData);
        
        // Update the last status update time
        setLastStatusUpdate(new Date().toLocaleTimeString());
        
        // Update the UI with the new status data
        setSourceData(prevData => {
          // If we don't have source data yet, don't update
          if (!prevData || prevData.length === 0) return prevData;
          
          // Create a copy of the current source data
          return prevData.map(source => {
            // If we have status data for this source, update it
            if (statusData[source.source]) {
              const newStatusData = statusData[source.source];
              return {
                ...source,
                read: newStatusData.read,
                replied: newStatusData.replied,
                contacted: Math.max(source.contacted, newStatusData.contacted),
                failed: Math.max(source.failed, newStatusData.failed)
              };
            }
            return source;
          });
        });
      });
      
      // Clean up subscription when component unmounts
      return () => {
        console.log("Cleaning up real-time subscription");
        unsubscribe();
      };
    }
  }, [user]);

  const handleInitiateConversations = async (source: string) => {
    if (!templateId) {
      toast.error('No WhatsApp template ID found in your settings. Please set up a template first.');
      return;
    }

    if (!templateLanguage) {
      toast.error('No WhatsApp template language found in your settings. Please configure your template language.');
      return;
    }

    if (!whatsappPhoneId) {
      toast.error('No WhatsApp phone ID found in your settings. Please configure your WhatsApp phone ID.');
      return;
    }

    if (messageLimit <= 0) {
      toast.error('No message limit set in your settings. Please configure your daily message limit.');
      return;
    }

    try {
      setInitiatingSource(source);
      
      // Update the UI to show this source is in progress
      setSourceData(prevData => 
        prevData.map(item => 
          item.source === source ? { ...item, inProgress: true } : item
        )
      );
      
      // Refresh the current message count before starting
      await fetchMessageCount();
      
      // Calculate how many more messages we can send today
      const remainingMessages = messageLimit - messagesUsedToday;
      
      if (remainingMessages <= 0) {
        throw new Error(`Daily message limit of ${messageLimit} reached. Try again tomorrow.`);
      }
      
      // Find all leads for this source
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id)
        .eq('source', source)
        .not('status', 'eq', 'Contacted'); // Only get leads that haven't been contacted yet
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!leads || leads.length === 0) {
        throw new Error('No leads found for this source or all leads have been contacted');
      }
      
      // Limit leads to process based on remaining message quota
      const leadsToProcess = leads.slice(0, remainingMessages);
      
      // Notify if we're not processing all leads due to limits
      if (leadsToProcess.length < leads.length) {
        toast.info(`Processing ${leadsToProcess.length} out of ${leads.length} leads due to daily message limit.`);
      }
      
      // Create a throttled process to send messages (to prevent hitting API limits)
      let succeeded = 0;
      let failed = 0;
      
      for (const lead of leadsToProcess) {
        // Actual WhatsApp API call instead of simulation
        try {
          console.log('Processing lead:', lead.name, lead.phone);
          
          // Send the WhatsApp template message with lead details
          const response = await sendWhatsAppTemplateMessage(lead.phone, templateId, templateLanguage, lead.id, lead.name);
          
          // Check if message was sent successfully
          const success = response && response.success;
          console.log('WhatsApp API response:', response);
          
          if (success) {
            // Update lead status to Contacted
            const { error: updateError } = await supabase
              .from('leads')
              .update({ status: 'Contacted' })
              .eq('id', lead.id);
            
            if (updateError) {
              console.error('Error updating lead status:', updateError);
              failed++;
            } else {
              // The conversation is already recorded in the API route
              // Do not create a duplicate record here
              
              // Increment used messages count
              setMessagesUsedToday(prev => prev + 1);
              succeeded++;
            }
          } else {
            // Update lead status to Failed
            const { error: updateError } = await supabase
              .from('leads')
              .update({ status: 'Failed' })
              .eq('id', lead.id);
            
            if (updateError) {
              console.error('Error updating lead status:', updateError);
            }
            
            // Record failed conversation - only for failures since successful ones
            // are recorded in the API
            const { data: convData, error: convError } = await supabase
              .from('lead_conversations')
              .insert({
                user_id: user?.id,
                lead_id: lead.id,
                template_id: templateId,
                language: templateLanguage,
                status: 'failed',
                created_at: new Date().toISOString()
              });
            
            if (convError) {
              console.error('Error recording failed conversation:', convError);
              console.error('Attempted to insert with template_id:', templateId);
              console.error('Using language:', templateLanguage);
              console.error('Schema issue? Check if lead_conversations table exists and has expected columns');
            }
            
            // Increment used messages count
            setMessagesUsedToday(prev => prev + 1);
            failed++;
          }
          
          // Update the UI to show progress
          setSourceData(prevData => 
            prevData.map(item => 
              item.source === source ? { 
                ...item, 
                contacted: item.contacted + (success ? 1 : 0),
                failed: item.failed + (success ? 0 : 1)
              } : item
            )
          );
          
        } catch (e) {
          console.error('Error sending message:', e);
          failed++;
        }
        
        // Add a small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (succeeded + failed === leadsToProcess.length) {
        const remainingLeads = leads.length - leadsToProcess.length;
        if (remainingLeads > 0) {
          toast.success(`Completed: ${succeeded} messages sent, ${failed} failed. ${remainingLeads} leads remaining due to daily limit.`);
        } else {
          toast.success(`Completed: ${succeeded} messages sent, ${failed} failed.`);
        }
      }
    } catch (error: any) {
      console.error('Error initiating conversations:', error);
      toast.error(`Failed to initiate conversations: ${error.message}`);
    } finally {
      setInitiatingSource(null);
      
      // Update UI to show this source is no longer in progress
      setSourceData(prevData => 
        prevData.map(item => 
          item.source === source ? { ...item, inProgress: false } : item
        )
      );
      
      // Refresh data to get accurate counts
      fetchLeadSourceData();
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  // Define the function to send WhatsApp template messages
  async function sendWhatsAppTemplateMessage(phoneNumber: string, templateName: string, language: string, leadId: string, leadName: string) {
    try {
      console.log('WhatsApp Template Debug Info:', {
        phoneNumber,
        leadName,
        leadId,
        templateName,
        language,
        templateImageUrl,
        whatsappPhoneId,
        templateId
      });
      
      // Find the lead to get all fields for template variables
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (leadError) {
        console.error('Error fetching lead details:', leadError);
        throw new Error('Could not retrieve lead details for template variables');
      }
      
      // Create a simplified payload for known template types
      // Based on the template screenshot, we need to match EXACTLY what's expected
      let requestData: any = {
        phoneNumber,
        leadId,
        userId: user?.id,
        templateId: templateName,
        templateLanguage: language,
        whatsappPhoneId,
        // Only include name as the first parameter based on template screenshot
        templateVariables: {
          1: (lead.name || leadName || '').toString().trim()
        },
        // Explicitly define the components structure with header, body, and footer
        explicitComponents: {
          header: templateImageUrl ? {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: templateImageUrl
                }
              }
            ]
          } : null,
          body: {
            type: 'body',
            parameters: [
              { type: 'text', text: (lead.name || leadName || '').toString().trim() }
            ]
          },
          footer: {
            type: 'footer',
            parameters: []
          }
        }
      };
      
      // Re-enable image support
      if (templateImageUrl && templateImageUrl.trim() !== '') {
        console.log('Template has image URL:', templateImageUrl);
        requestData.templateImageUrl = templateImageUrl;
      }
      
      // Log the full request data for debugging
      console.log('WhatsApp API request data:', JSON.stringify(requestData, null, 2));
      
      // Send the request
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Get detailed error message from response
        const errorMessage = responseData.error || `Server responded with status: ${response.status}`;
        console.error('WhatsApp API error:', errorMessage, responseData);
        
        // Try fallback approach if original fails
        if (errorMessage.includes('Required parameter')) {
          console.log('Attempting fallback approach for template message...');
          
          // Create a simplified fallback payload without image
          const fallbackData = {
            ...requestData,
            templateImageUrl: undefined, // Remove image URL
            needsHeaderComponent: false,
            isFallback: true
          };
          
          console.log('Using fallback data:', JSON.stringify(fallbackData, null, 2));
          
          // Try again with simplified payload
          const fallbackResponse = await fetch('/api/whatsapp/send-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fallbackData),
          });
          
          const fallbackResponseData = await fallbackResponse.json();
          
          if (fallbackResponse.ok) {
            console.log('Fallback approach succeeded:', fallbackResponseData);
            return fallbackResponseData;
          } else {
            console.error('Fallback approach also failed:', fallbackResponseData);
            throw new Error(errorMessage);
          }
        } else {
          // Original error wasn't about missing parameters
          toast.error(`Failed to send WhatsApp message: ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }
      
      console.log('WhatsApp template message sent successfully:', responseData);
      return responseData;
    } catch (error: any) {
      console.error('Error sending WhatsApp template message:', error.message);
      
      // Show a friendly error message to the user
      toast.error('Failed to send WhatsApp message. Check console for details.', {
        id: 'whatsapp-error', // Using ID for deduplication
        duration: 5000
      });
      
      throw error;
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-gray-900">Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-gray-800">Loading source data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <FileTextIcon className="h-5 w-5" />
          Lead Sources
        </CardTitle>
        <div className="flex items-center justify-between">
          {messageLimit > 0 && (
            <div className="text-sm text-gray-700 mt-1 flex items-center">
              <span>
                Daily message limit: {messagesUsedToday} / {messageLimit} used
                {messagesUsedToday >= messageLimit && (
                  <span className="text-red-600 ml-2 font-semibold">
                    Limit reached!
                  </span>
                )}
              </span>
              <div 
                className="ml-2 h-2 w-20 bg-gray-200 rounded-full overflow-hidden"
                title={`${messagesUsedToday} of ${messageLimit} messages used today`}
              >
                <div 
                  className={`h-full ${messagesUsedToday >= messageLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{ width: `${Math.min(100, (messagesUsedToday / messageLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {lastStatusUpdate && (
            <div className="text-xs text-gray-500 ml-2">
              Last status update: {lastStatusUpdate}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-600"
            onClick={() => fetchLeadSourceData()}
            title="Refresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sourceData.length === 0 ? (
          <div className="text-center py-6">
            <FileIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="font-medium text-lg mb-1 text-gray-900">No source data available</h3>
            <p className="text-gray-700 mb-4">
              Upload CSV files in the Leads section to see source distribution
            </p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sourceData.map((source, index) => (
              <motion.div 
                key={source.source}
                variants={itemVariants} 
                className="relative"
              >
                <Card className="overflow-hidden h-full bg-white shadow-sm">
                  <div className={`absolute top-0 left-0 w-1 h-full ${source.color.split(' ')[0]}`} />
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="truncate max-w-[75%]">
                          <h3 className="font-medium text-gray-900 truncate" title={source.source}>
                            {source.source}
                          </h3>
                        </div>
                        <Badge className={source.color}>
                          {((source.count / totalLeads) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      
                      {/* Lead stats */}
                      <div className="grid grid-cols-3 gap-2 text-gray-800">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Total</span>
                          <span className="text-gray-900 font-semibold">{source.count}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Contacted</span>
                          <span className="text-green-600 font-semibold">{source.contacted}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Failed</span>
                          <span className="text-red-600 font-semibold">{source.failed}</span>
                        </div>
                      </div>

                      {/* Read and Reply stats */}
                      {source.contacted > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-gray-800 mt-1">
                          <div className="flex items-center gap-1">
                            <EyeIcon className="h-3 w-3 text-blue-600" />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-600">Read</span>
                              <div className="flex items-center gap-1">
                                <span className="text-blue-600 font-semibold">{source.read}</span>
                                <span className="text-xs text-gray-500">
                                  ({source.contacted > 0 ? Math.round((source.read / source.contacted) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <ReplyIcon className="h-3 w-3 text-indigo-600" />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-600">Replied</span>
                              <div className="flex items-center gap-1">
                                <span className="text-indigo-600 font-semibold">{source.replied}</span>
                                <span className="text-xs text-gray-500">
                                  ({source.contacted > 0 ? Math.round((source.replied / source.contacted) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Read progress bar */}
                      {source.contacted > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700">Read Rate</span>
                            <span className="text-gray-700">{source.contacted > 0 ? Math.round((source.read / source.contacted) * 100) : 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${source.contacted > 0 ? (source.read / source.contacted) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Reply progress bar */}
                      {source.contacted > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700">Reply Rate</span>
                            <span className="text-gray-700">{source.contacted > 0 ? Math.round((source.replied / source.contacted) * 100) : 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full"
                              style={{ width: `${source.contacted > 0 ? (source.replied / source.contacted) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Contact progress bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700">Contact Progress</span>
                          <span className="text-gray-700">{source.count > 0 ? Math.round((source.contacted / source.count) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${source.count > 0 ? (source.contacted / source.count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Initiate button */}
                      <Button
                        onClick={() => handleInitiateConversations(source.source)}
                        disabled={
                          source.inProgress || 
                          initiatingSource !== null || 
                          !templateId || 
                          !templateLanguage || 
                          !whatsappPhoneId ||
                          messagesUsedToday >= messageLimit ||
                          source.contacted === source.count // Disable when all leads are contacted
                        }
                        size="sm"
                        className="mt-2 text-gray-800 font-medium"
                        style={{
                          backgroundColor: source.contacted === 0 ? WHATSAPP_GREEN : undefined,
                          border: source.contacted === 0 ? 'none' : undefined
                        }}
                        variant={source.contacted === 0 ? "default" : "outline"}
                      >
                        {source.inProgress ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-800 border-t-transparent"></div>
                            <span className={source.contacted === 0 ? "text-gray-800" : "text-gray-800"}>Sending...</span>
                          </>
                        ) : messagesUsedToday >= messageLimit ? (
                          <>
                            <AlertTriangleIcon className="mr-2 h-4 w-4" />
                            <span className="text-gray-800">Daily Limit Reached</span>
                          </>
                        ) : source.contacted === 0 ? (
                          <>
                            <MessageSquareIcon className="mr-2 h-4 w-4" />
                            <span className="text-gray-800">Start Conversations</span>
                          </>
                        ) : source.contacted < source.count ? (
                          <>
                            <MessageSquareIcon className="mr-2 h-4 w-4" />
                            <span className="text-gray-800">Continue Outreach</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon className="mr-2 h-4 w-4" />
                            <span className="text-gray-800">All Contacted</span>
                          </>
                        )}
                      </Button>
                      
                      {!templateId && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Set a template ID in settings first
                        </p>
                      )}
                      
                      {templateId && !templateLanguage && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Set a template language in settings first
                        </p>
                      )}
                      
                      {templateId && templateLanguage && !whatsappPhoneId && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Set your WhatsApp Phone ID in settings first
                        </p>
                      )}
                      
                      {/* Add notification for partial contacts due to daily limits */}
                      {source.contacted > 0 && source.contacted < source.count && messagesUsedToday >= messageLimit && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Partially contacted. Continue tomorrow when limit resets.
                        </p>
                      )}
                      
                      {templateId && messageLimit > 0 && messagesUsedToday >= messageLimit * 0.8 && messagesUsedToday < messageLimit && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Close to daily limit ({messagesUsedToday}/{messageLimit})
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
} 