'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, Title, Text, Accordion, AccordionBody, AccordionHeader, AccordionList } from '@tremor/react';

export default function ApiPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
        <p className="text-gray-600">
          Reference for integrating with the WhatsApp bot API
        </p>
      </div>

      <Card className="mb-6">
        <Title>Authentication</Title>
        <Text className="mb-4">
          All API requests require authentication. You can authenticate using the API key from your settings page.
        </Text>
        <div className="bg-gray-100 p-4 rounded-md">
          <code className="text-sm">
            Authorization: Bearer YOUR_API_KEY
          </code>
        </div>
      </Card>

      <div className="mb-6">
        <AccordionList>
          <Accordion>
            <AccordionHeader>Send WhatsApp Message</AccordionHeader>
            <AccordionBody>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">POST /api/whatsapp/send</h3>
                  <p className="text-gray-600 text-sm">Send a WhatsApp message to a user</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Request Body</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "to": "phone_number",
  "type": "text",
  "text": {
    "body": "Your message content"
  }
}`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Response</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "success": true,
  "messageId": "wamid.abcdefg123456789"
}`}
                  </pre>
                </div>
              </div>
            </AccordionBody>
          </Accordion>

          <Accordion>
            <AccordionHeader>Get Conversation History</AccordionHeader>
            <AccordionBody>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">GET /api/conversations/:phoneNumber</h3>
                  <p className="text-gray-600 text-sm">Retrieve conversation history for a specific user</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Path Parameters</h4>
                  <ul className="list-disc list-inside text-sm mt-2">
                    <li><span className="font-mono">phoneNumber</span> - The user's phone number</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Query Parameters</h4>
                  <ul className="list-disc list-inside text-sm mt-2">
                    <li><span className="font-mono">limit</span> - Number of messages to return (default: 50)</li>
                    <li><span className="font-mono">before</span> - Return messages before this timestamp</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Response</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "conversations": [
    {
      "id": "msg_123",
      "from": "user",
      "content": "Hello",
      "timestamp": "2025-04-24T12:34:56Z"
    },
    {
      "id": "msg_124",
      "from": "bot",
      "content": "Hi there! How can I help you today?",
      "timestamp": "2025-04-24T12:35:10Z"
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </AccordionBody>
          </Accordion>

          <Accordion>
            <AccordionHeader>Create Lead</AccordionHeader>
            <AccordionBody>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">POST /api/leads</h3>
                  <p className="text-gray-600 text-sm">Create a new lead in the system and Trello</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Request Body</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "source": "WhatsApp",
  "notes": "Interested in product X"
}`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Response</h4>
                  <pre className="bg-gray-100 p-3 rounded-md text-sm mt-2 overflow-x-auto">
{`{
  "success": true,
  "lead": {
    "id": "lead_789",
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john.doe@example.com",
    "status": "New Lead",
    "source": "WhatsApp",
    "dateAdded": "2025-04-24T17:35:22Z",
    "trelloCardId": "card_abc123"
  }
}`}
                  </pre>
                </div>
              </div>
            </AccordionBody>
          </Accordion>
        </AccordionList>
      </div>

      <Card>
        <Title>Webhooks</Title>
        <Text className="mb-4">
          Set up webhooks to receive real-time updates from the WhatsApp bot.
        </Text>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Incoming Message Webhook</h3>
            <p className="text-gray-600 text-sm">Receive notifications when new messages arrive</p>
            <div className="bg-gray-100 p-3 rounded-md text-sm mt-2">
              <code>POST /webhooks/incoming-message</code>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium">Lead Status Change Webhook</h3>
            <p className="text-gray-600 text-sm">Receive notifications when a lead status changes</p>
            <div className="bg-gray-100 p-3 rounded-md text-sm mt-2">
              <code>POST /webhooks/lead-status</code>
            </div>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
} 