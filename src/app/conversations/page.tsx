'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSearch, HiOutlinePaperClip, HiOutlineEmojiHappy, HiOutlineMicrophone, HiDotsVertical, HiOutlinePaperAirplane } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';

// Animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: 0.2,
      when: "beforeChildren",
      staggerChildren: 0.05
    } 
  }
};

const panelVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.15, 
      ease: "easeOut" 
    } 
  }
};

const contactVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.1,
      ease: "easeOut" 
    } 
  }
};

const messageVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 20
    } 
  }
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 }
};

// Define types for our data
interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  status: string;
  unread: number;
  avatar: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact';
  timestamp: string;
  type?: string;
}

interface Conversation {
  id: string;
  contactId: string;
  messages: Message[];
}

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Use the auth context hook
  const { user, loading: authLoading } = useAuth();
  
  // Fetch conversations with auth handling
  const fetchContacts = async () => {
    if (authLoading) return; // Wait for auth state to resolve
    
    if (!user) {
      setError('You need to be logged in to view conversations.');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Get conversations with auth token
      const response = await fetch(`/api/conversations?search=${searchTerm}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please try logging in again.');
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          // Handle the specific case of the missing database view
          if (errorText.includes("relation") && errorText.includes("does not exist")) {
            setError("Database schema needs to be updated. Please contact your administrator.");
          } else {
            setError(`Failed to load conversations: ${response.statusText}`);
          }
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Conversations fetched:', data.conversations?.length || 0);
      setContacts(data.conversations || []);
      
      // Select the first contact if none is selected and we have contacts
      if (data.conversations?.length > 0 && !selectedContact) {
        setSelectedContact(data.conversations[0]);
        fetchMessages(data.conversations[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Error loading conversations');
      toast.error(`Failed to load conversations: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to fetch contacts when component mounts or search term changes
  useEffect(() => {
    fetchContacts();
    
    // Set up polling for new messages (every 15 seconds)
    const intervalId = setInterval(fetchContacts, 15000);
    
    return () => clearInterval(intervalId); // Clean up on unmount
  }, [user, authLoading, searchTerm]);
  
  // Fetch messages when selecting a contact
  const fetchMessages = async (leadId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ leadId }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please try logging in again.');
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          // Handle the specific case of the missing database view
          if (errorText.includes("relation") && errorText.includes("does not exist")) {
            setError("Database schema needs to be updated. Please contact your administrator.");
          } else {
            setError(`Failed to load messages: ${response.statusText}`);
          }
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Error loading messages');
      toast.error(`Failed to load messages: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };
  
  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    return (
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContact || !user) return;
    
    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: messageInput,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    
    // Send message to API
    try {
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          phoneNumber: selectedContact.phone,
          message: messageInput,
          leadId: selectedContact.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to send message: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // Refresh messages to get the actual message record
      await fetchMessages(selectedContact.id);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Error sending message');
      toast.error(`Failed to send message: ${err.message || 'Unknown error'}`);
      
      // Remove the temporary message if it failed
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageVariants}
        style={{ 
          display: 'flex', 
          height: '100vh',
          backgroundColor: '#f0f2f5',
          overflow: 'hidden',
          width: 'auto',
          margin: '-2rem -2rem -2rem -2rem', 
          position: 'relative',
          left: '0',
          right: '0',
        }}
      >
        {/* Error message if needed */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            zIndex: 50,
            maxWidth: '90%',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>Error:</span> {error}
              <button
                onClick={() => {
                  setError('');
                  if (selectedContact) {
                    fetchMessages(selectedContact.id);
                  }
                }}
                style={{
                  marginLeft: '0.5rem',
                  backgroundColor: 'white',
                  color: '#ef4444',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      
        {/* Contacts list - Left side */}
        <motion.div 
          variants={panelVariants}
          style={{ 
            width: '350px', 
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            flexShrink: 0,
          }}
        >
          {/* Header with search */}
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f0f2f5',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
            >
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
            </motion.div>
          </div>
          
          {/* Contacts list */}
          <motion.div 
            style={{ 
              flex: '1 1 0%', 
              overflowY: 'auto',
            }}
          >
            {loading && contacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading conversations...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No conversations found
              </div>
            ) : (
              <AnimatePresence>
                {filteredContacts.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    variants={contactVariants}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ backgroundColor: selectedContact?.id === contact.id ? '#e5e7eb' : '#f5f7f9' }}
                    onClick={() => handleContactSelect(contact)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      backgroundColor: selectedContact?.id === contact.id ? '#f0f2f5' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '9999px',
                        backgroundColor: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        marginRight: '0.75rem',
                      }}
                    >
                      {contact.avatar || '👤'}
                    </motion.div>
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
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            style={{
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
                            }}
                          >
                            {contact.unread}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </motion.div>
        
        {/* Conversation - Right side */}
        <motion.div 
          variants={panelVariants}
          style={{ 
            flex: '1 1 auto', 
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f0f2f5',
            minWidth: 0,
            maxHeight: '100%',
          }}
        >
          {/* Conversation header */}
          {selectedContact ? (
            <>
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ 
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '9999px',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      marginRight: '0.75rem',
                    }}
                  >
                    {selectedContact.avatar || '👤'}
                  </motion.div>
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
                <motion.button 
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  <HiDotsVertical style={{ color: '#6b7280', width: '1.25rem', height: '1.25rem' }} />
                </motion.button>
              </motion.div>
              
              {/* Messages area */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ 
                  flex: '1 1 auto', 
                  overflowY: 'auto',
                  padding: '1rem',
                  backgroundColor: '#e5ded8',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23dddddd\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minHeight: 0,
                }}
              >
                {loading ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#6b7280' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#6b7280' }}>
                    No messages yet. Send your first message!
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        variants={messageVariants}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.05 }}
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
                        {/* Special styling for template messages */}
                        {message.type === 'template' && (
                          <div style={{
                            position: 'absolute',
                            top: '-0.75rem',
                            left: message.sender === 'user' ? 'auto' : '0.5rem',
                            right: message.sender === 'user' ? '0.5rem' : 'auto',
                            fontSize: '0.65rem',
                            backgroundColor: '#f3f4f6',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '0.25rem',
                            color: '#6b7280',
                          }}>
                            Template
                          </div>
                        )}
                        <p style={{ margin: 0, marginBottom: '0.25rem', color: '#333333' }}>{message.text}</p>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          color: '#6b7280',
                          float: 'right',
                          marginLeft: '0.5rem',
                          marginTop: '0.25rem',
                        }}>
                          {message.timestamp}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
              
              {/* Message input area */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ 
                  padding: '0.75rem 1rem',
                  backgroundColor: 'white',
                  borderTop: '1px solid #e5e7eb',
                  marginTop: 'auto',
                }}
              >
                <form 
                  onSubmit={handleSendMessage} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem' 
                  }}
                >
                  <motion.button 
                    type="button" 
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
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
                  </motion.button>
                  <motion.button 
                    type="button" 
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
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
                  </motion.button>
                  <motion.input
                    whileFocus={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.2)" }}
                    type="text"
                    placeholder="Type a message"
                    value={messageInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
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
                  <motion.button 
                    type={messageInput.trim() ? 'submit' : 'button'} 
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {messageInput.trim() ? (
                      <HiOutlinePaperAirplane style={{ 
                        color: '#10b981', 
                        width: '1.5rem', 
                        height: '1.5rem',
                        transform: 'rotate(90deg)'
                      }} />
                    ) : (
                      <HiOutlineMicrophone style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} />
                    )}
                  </motion.button>
                </form>
              </motion.div>
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              backgroundColor: '#f9fafb',
              flexDirection: 'column',
              color: '#6b7280',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <h2 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>WhatsApp Conversations</h2>
              <p>Select a conversation or search for a contact</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
} 