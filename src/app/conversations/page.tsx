'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // For scrolling
  const contactsListRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Use the auth context hook
  const { user, loading: authLoading } = useAuth();
  
  // Helper function to get status styling
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'replied':
        return {
          backgroundColor: '#10b981', // green
          color: 'white'
        };
      case 'contacted':
        return {
          backgroundColor: '#3b82f6', // blue
          color: 'white'
        };
      case 'failed':
        return {
          backgroundColor: '#ef4444', // red
          color: 'white'
        };
      case 'pending':
        return {
          backgroundColor: '#f59e0b', // amber
          color: 'white'
        };
      default:
        return {
          backgroundColor: '#6b7280', // gray
          color: 'white'
        };
    }
  };
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Fetch conversations with auth handling
  const fetchContacts = useCallback(async (isInitialLoad = false, isPolling = false, pageToLoad = 1) => {
    if (authLoading) return; // Wait for auth state to resolve
    
    if (!user) {
      setError('You need to be logged in to view conversations.');
      setInitialLoading(false);
      return;
    }
    
    try {
      // Set appropriate loading states
      if (isInitialLoad) {
        setInitialLoading(true);
        setError(''); // Clear any previous errors
      } else if (isPolling) {
        setRefreshing(true);
      } else if (pageToLoad > 1) {
        setLoadingMore(true);
      }
      
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Get conversations with auth token
      const response = await fetch(`/api/conversations?search=${encodeURIComponent(searchTerm)}&page=${pageToLoad}&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }
      
      const data = await response.json();
      console.log('Conversations fetched:', data.conversations?.length || 0);
      
      const newContacts = data.conversations || [];
      
      // Handle pagination
      if (pageToLoad === 1 || isInitialLoad) {
        // Replace all contacts for first page or initial load
        setAllContacts(newContacts);
        setCurrentPage(1);
      } else {
        // Append contacts for subsequent pages with deduplication
        setAllContacts(prev => {
          const existingIds = new Set(prev.map(contact => contact.id));
          const uniqueNewContacts = newContacts.filter((contact: Contact) => !existingIds.has(contact.id));
          console.log(`Page ${pageToLoad}: Received ${newContacts.length} contacts, ${uniqueNewContacts.length} unique after deduplication`);
          return [...prev, ...uniqueNewContacts];
        });
        setCurrentPage(pageToLoad);
      }
      
      // Update pagination state
      setHasMorePages(data.pagination?.hasMore || false);
      
      // Apply search filtering (only if not loading more pages)
      if (pageToLoad === 1 || isInitialLoad) {
        // Filter out failed conversations and apply search filter
        let filtered = newContacts.filter((contact: Contact) => contact.status !== 'failed');
        
        if (searchTerm) {
          filtered = filtered.filter((contact: Contact) => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm) ||
            contact.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setFilteredContacts(filtered);
      } else {
        // For additional pages, filter and append to existing filtered results with deduplication
        const filtered = newContacts.filter((contact: Contact) => contact.status !== 'failed');
        setFilteredContacts(prev => {
          const existingIds = new Set(prev.map(contact => contact.id));
          const uniqueFiltered = filtered.filter((contact: Contact) => !existingIds.has(contact.id));
          return [...prev, ...uniqueFiltered];
        });
      }
      
      // Handle selection of first contact on initial load
      if (isInitialLoad && newContacts.length > 0 && !selectedContact) {
        const firstContact = newContacts[0];
        setSelectedContact(firstContact);
        fetchMessages(firstContact.id);
      }
      
      // If polling and we have a selected contact, try to keep it selected
      if (isPolling && selectedContact) {
        // Find the updated version of the selected contact
        const allCurrentContacts = pageToLoad === 1 ? newContacts : [...allContacts, ...newContacts];
        const updatedSelectedContact = allCurrentContacts.find(
          (contact: Contact) => contact.id === selectedContact.id
        );
        
        // Update selected contact if it still exists
        if (updatedSelectedContact) {
          setSelectedContact(updatedSelectedContact);
        }
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      
      // Handle timeout errors specifically
      if (err.name === 'AbortError') {
        setError('Request timed out. The server might be busy. Please try again.');
      } else {
        setError(err.message || 'Error loading conversations');
      }
      
      // Only show toast for non-polling errors to avoid spam
      if (!isPolling) {
        toast.error(`Failed to load conversations: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [authLoading, user, searchTerm, selectedContact, allContacts]);
  
  // Effect to fetch contacts when component mounts
  useEffect(() => {
    fetchContacts(true); // Initial load
    
    // Set up polling for new messages (every 30 seconds instead of 15)
    const intervalId = setInterval(() => {
      // Only poll if not currently loading and no errors
      if (!initialLoading && !loadingMore && !error) {
        fetchContacts(false, true); // Polling refresh
      }
    }, 30000); // Increased from 15000 to 30000
    
    return () => clearInterval(intervalId); // Clean up on unmount
  }, [user, authLoading]); // Removed fetchContacts from dependencies
  
  // Effect to re-fetch contacts when search term changes
  useEffect(() => {
    // Debounce search to avoid excessive API calls
    const searchTimeout = setTimeout(() => {
      if (searchTerm !== '') {
        // If there's a search term, fetch from API to get server-side filtering
        setCurrentPage(1);
        setHasMorePages(true);
        fetchContacts(true);
      } else {
        // If search term is cleared, refetch to get all conversations
        setCurrentPage(1);
        setHasMorePages(true);
        fetchContacts(true);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(searchTimeout);
  }, [searchTerm]); // Removed fetchContacts from dependencies
  
  // Fetch messages when selecting a contact
  const fetchMessages = useCallback(async (leadId: string) => {
    if (!user) return;
    
    try {
      setInitialLoading(true);
      
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setInitialLoading(false);
        return;
      }
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          leadId, 
          all_sources: true,
          include_all: true,
          include_latest: true
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
        setInitialLoading(false);
        return;
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      
      // Handle timeout errors specifically
      if (err.name === 'AbortError') {
        setError('Request timed out loading messages. Please try selecting the conversation again.');
      } else {
        setError(err.message || 'Error loading messages');
      }
      
      toast.error(`Failed to load messages: ${err.message || 'Unknown error'}`);
    } finally {
      setInitialLoading(false);
    }
  }, [user]);
  
  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };
  
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
    setSendingMessage(true);
    
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
          leadId: selectedContact.id,
          all_sources: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to send message: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // Refresh messages to get the actual message record
      await fetchMessages(selectedContact.id);
      
      // Update the contact's last message in the contacts list
      const updatedContact = {
        ...selectedContact,
        lastMessage: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Update contacts array
      setAllContacts(prevContacts => {
        const updatedContacts = prevContacts.map(contact => 
          contact.id === selectedContact.id ? updatedContact : contact
        );
        return updatedContacts;
      });
      
      // Also update in filtered contacts to ensure UI updates
      setFilteredContacts(prevFiltered => {
        const updatedFiltered = prevFiltered.map(contact => 
          contact.id === selectedContact.id ? updatedContact : contact
        );
        return updatedFiltered;
      });
      
      // Update selected contact
      setSelectedContact(updatedContact);
      
      // Show a success toast
      toast.success('Message sent successfully');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Error sending message');
      toast.error(`Failed to send message: ${err.message || 'Unknown error'}`);
      
      // Remove the temporary message if it failed
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!contactsListRef.current || loadingMore || !hasMorePages) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contactsListRef.current;
    
    // Load more when scrolled to bottom (with some buffer)
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      console.log(`Loading more conversations - current page: ${currentPage}, hasMore: ${hasMorePages}, total contacts: ${filteredContacts.length}`);
      const nextPage = currentPage + 1;
      fetchContacts(false, false, nextPage);
    }
  }, [loadingMore, hasMorePages, currentPage, fetchContacts]);
  
  // Add scroll listener
  useEffect(() => {
    const contactsList = contactsListRef.current;
    if (contactsList) {
      contactsList.addEventListener('scroll', handleScroll);
      return () => contactsList.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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
            ref={contactsListRef}
            style={{ 
              flex: '1 1 0%', 
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {initialLoading && filteredContacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading conversations...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No conversations found
              </div>
            ) : (
              <>
                {/* Refreshing indicator */}
                {refreshing && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '0.5rem', 
                    right: '0.5rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    zIndex: 10,
                  }}>
                    Updating...
                  </div>
                )}
                
                {/* Conversation list */}
                <AnimatePresence>
                  {filteredContacts.map((contact, index) => (
                    <motion.div
                      key={contact.id}
                      variants={contactVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: Math.min(index * 0.01, 0.2) }}
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
                            flex: '1 1 0%',
                          }}>{contact.name}</h3>
                          {/* Status tag and timestamp stacked vertically */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'flex-end', 
                            gap: '0.25rem',
                            flexShrink: 0,
                          }}>
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              style={{
                                ...getStatusStyle(contact.status),
                                fontSize: '0.5rem',
                                fontWeight: 600,
                                padding: '0.1rem 0.25rem',
                                borderRadius: '0.25rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em',
                                lineHeight: 1,
                              }}
                            >
                              {contact.status}
                            </motion.span>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              color: contact.unread > 0 ? '#10b981' : '#6b7280',
                              fontWeight: contact.unread > 0 ? 500 : 400,
                              whiteSpace: 'nowrap',
                            }}>{contact.timestamp}</span>
                          </div>
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
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <div style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Loading more conversations...
                  </div>
                )}
                
                {/* End of list indicator */}
                {!hasMorePages && filteredContacts.length > 0 && (
                  <div style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    color: '#9ca3af',
                    fontSize: '0.75rem'
                  }}>
                    You've reached the end
                  </div>
                )}
              </>
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
                {initialLoading ? (
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
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
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
                    {/* Add element to scroll to */}
                    <div ref={messageEndRef} style={{ height: '1px', width: '100%' }} />
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
                    placeholder={sendingMessage ? "Sending..." : "Type a message"}
                    value={messageInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                    disabled={sendingMessage}
                    style={{
                      flex: '1 1 0%',
                      backgroundColor: '#f0f2f5',
                      border: 'none',
                      outline: 'none',
                      borderRadius: '1.25rem',
                      padding: '0.75rem 1rem',
                      fontSize: '0.9375rem',
                      opacity: sendingMessage ? 0.8 : 1,
                    }}
                  />
                  <motion.button 
                    type={messageInput.trim() && !sendingMessage ? 'submit' : 'button'} 
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    disabled={sendingMessage}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: sendingMessage ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: sendingMessage ? 0.7 : 1,
                    }}
                  >
                    {messageInput.trim() ? (
                      <HiOutlinePaperAirplane style={{ 
                        color: sendingMessage ? '#84c7ab' : '#10b981', 
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