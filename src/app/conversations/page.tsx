'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiOutlineSearch, HiOutlinePaperClip, HiOutlineEmojiHappy, HiOutlineMicrophone, HiDotsVertical } from 'react-icons/hi';

// Mock data - in a real application, this would come from your API
const mockContacts = [
  {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    lastMessage: 'I would like to know more about your product',
    timestamp: '2h ago',
    status: 'active',
    unread: 2,
    avatar: '👨‍💼',
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '+0987654321',
    lastMessage: 'Thanks for the information',
    timestamp: '5h ago',
    status: 'active',
    unread: 0,
    avatar: '👩‍💼',
  },
  {
    id: '3',
    name: 'Robert Johnson',
    phone: '+1122334455',
    lastMessage: 'When will my order arrive?',
    timestamp: '1d ago',
    status: 'pending',
    unread: 1,
    avatar: '👨‍🦰',
  },
  {
    id: '4',
    name: 'Lisa Williams',
    phone: '+5544332211',
    lastMessage: 'Perfect, thank you!',
    timestamp: '2d ago',
    status: 'closed',
    unread: 0,
    avatar: '👩‍🦱',
  },
  {
    id: '5',
    name: 'Michael Brown',
    phone: '+6677889900',
    lastMessage: 'Can you provide more details?',
    timestamp: '3d ago',
    status: 'active',
    unread: 0,
    avatar: '👨‍🦱',
  },
];

// Mock conversation messages
const mockMessages = [
  {
    id: '1',
    contactId: '1',
    messages: [
      { id: 'm1', text: 'Hello there! 👋', sender: 'contact', timestamp: '10:30 AM' },
      { id: 'm2', text: 'Hi John! How can I help you today?', sender: 'user', timestamp: '10:31 AM' },
      { id: 'm3', text: 'I would like to know more about your product', sender: 'contact', timestamp: '10:32 AM' },
      { id: 'm4', text: 'Sure! We offer an AI-powered WhatsApp chatbot that can handle customer inquiries automatically.', sender: 'user', timestamp: '10:33 AM' },
      { id: 'm5', text: 'It can answer frequently asked questions, collect lead information, and escalate to a human agent when needed.', sender: 'user', timestamp: '10:33 AM' },
      { id: 'm6', text: 'That sounds interesting. What about pricing?', sender: 'contact', timestamp: '10:35 AM' },
    ]
  },
  {
    id: '2',
    contactId: '2',
    messages: [
      { id: 'm1', text: 'Hi, I received your email about the new features', sender: 'contact', timestamp: '9:20 AM' },
      { id: 'm2', text: 'Hello Jane! Yes, we just rolled out our latest update.', sender: 'user', timestamp: '9:22 AM' },
      { id: 'm3', text: 'Thanks for the information', sender: 'contact', timestamp: '9:25 AM' },
    ]
  }
];

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(mockContacts[0]);
  const [messageInput, setMessageInput] = useState('');
  
  // Filter contacts based on search term
  const filteredContacts = mockContacts.filter(contact => {
    return (
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Get the selected conversation
  const selectedConversation = mockMessages.find(conv => conv.contactId === selectedContact.id);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() === '') return;
    
    // In a real app, you would send this to your API
    console.log('Sending message:', messageInput);
    setMessageInput('');
  };

  return (
    <DashboardLayout>
      <div style={{ 
        display: 'flex', 
        height: '100vh',
        backgroundColor: '#f0f2f5',
        overflow: 'hidden',
        width: 'auto',
        margin: '-2rem -2rem -2rem -2rem', 
        position: 'relative',
        left: '0',
        right: '0',
      }}>
        {/* Contacts list - Left side */}
        <div style={{ 
          width: '350px', 
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          flexShrink: 0,
        }}>
          {/* Header with search */}
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f0f2f5',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
            }}>
              <HiOutlineSearch style={{ color: '#6b7280', width: '1.25rem', height: '1.25rem' }} />
              <input
                type="text"
                placeholder="Search or start a new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  marginLeft: '0.5rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>
          
          {/* Contacts list */}
          <div style={{ 
            flex: '1 1 0%', 
            overflowY: 'auto',
          }}>
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  backgroundColor: selectedContact.id === contact.id ? '#f0f2f5' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '9999px',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '0.75rem',
                }}>
                  {contact.avatar}
                </div>
                <div style={{ flex: '1 1 0%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <h3 style={{ 
                      fontWeight: 500, 
                      fontSize: '0.9375rem',
                      color: '#111827',
                    }}>{contact.name}</h3>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: contact.unread > 0 ? '#10b981' : '#6b7280',
                      fontWeight: contact.unread > 0 ? 500 : 400,
                    }}>{contact.timestamp}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                  }}>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#4b5563',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '13rem',
                    }}>{contact.lastMessage}</p>
                    {contact.unread > 0 && (
                      <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Conversation - Right side */}
        <div style={{ 
          flex: '1 1 auto', 
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f0f2f5',
          minWidth: 0,
          maxHeight: '100%',
        }}>
          {/* Conversation header */}
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '9999px',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                marginRight: '0.75rem',
              }}>
                {selectedContact.avatar}
              </div>
              <div>
                <h3 style={{ 
                  fontWeight: 600, 
                  fontSize: '1rem',
                  color: '#111827',
                }}>{selectedContact.name}</h3>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                }}>{selectedContact.phone}</p>
              </div>
            </div>
            <button style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '9999px',
            }}>
              <HiDotsVertical style={{ color: '#6b7280', width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>
          
          {/* Messages area */}
          <div style={{ 
            flex: '1 1 auto', 
            overflowY: 'auto',
            padding: '1rem',
            backgroundColor: '#e5ded8',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23dddddd\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minHeight: 0,
          }}>
            {selectedConversation?.messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  backgroundColor: message.sender === 'user' ? '#dcf8c6' : 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                }}
              >
                <p style={{ margin: 0, marginBottom: '0.25rem' }}>{message.text}</p>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: '#6b7280',
                  float: 'right',
                  marginLeft: '0.5rem',
                  marginTop: '0.25rem',
                }}>
                  {message.timestamp}
                </span>
              </div>
            ))}
          </div>
          
          {/* Message input area */}
          <div style={{ 
            padding: '0.75rem 1rem',
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
            marginTop: 'auto',
          }}>
            <form 
              onSubmit={handleSendMessage} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}
            >
              <button 
                type="button" 
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HiOutlineEmojiHappy style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} />
              </button>
              <button 
                type="button" 
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HiOutlinePaperClip style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} />
              </button>
              <input
                type="text"
                placeholder="Type a message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                style={{
                  flex: '1 1 0%',
                  backgroundColor: '#f0f2f5',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '1.25rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9375rem',
                }}
              />
              <button 
                type={messageInput.trim() ? 'submit' : 'button'} 
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HiOutlineMicrophone style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 