import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { markLeadAsContacted, sendWhatsAppTemplateMessageForUser } from '../../lib/whatsapp';
import userSettings from '../../userSettings';

// Constants
const MAX_INITIATED_CONVERSATIONS = 950;
const MAX_DELIVERED_CONVERSATIONS = 950;
let initiatedConversationCount = 0;
let deliveredConversationCount = 0;
let pendingDeliveryCount = 0;
let failedDeliveryCount = 0;
let totalInitiatedConversations = 0;
const leadInfo = new Map();
let leads = [];

// Status file path
const STATUS_FILE_PATH = path.join(process.cwd(), 'lead_status.json');

// Utility function to print statistics
function printConversationStatistics() {
  console.log('\n==== Conversation Statistics ====');
  console.log(`Total Initiated: ${totalInitiatedConversations}`);
  console.log(`Delivered: ${deliveredConversationCount}`);
  console.log(`Pending Deliveries: ${pendingDeliveryCount}`);
  console.log(`Failed Deliveries: ${failedDeliveryCount}`);
  console.log('==================================\n');
}

// API Route to initiate conversations
export async function POST(request) {
  try {
    // Initialize user settings
    await userSettings.init();
    
    // Load leads from CSV
    leads = await loadLeadsFromCSV('leads.csv');
    if (leads.length === 0) {
      return NextResponse.json({ 
        error: 'No valid, uncontacted leads found in CSV. Check the file format and content.'
      }, { status: 400 });
    }
    
    // Start conversation initiation process
    await initiateConversations();
    
    return NextResponse.json({ 
      success: true,
      stats: {
        totalInitiated: totalInitiatedConversations,
        delivered: deliveredConversationCount,
        pending: pendingDeliveryCount,
        failed: failedDeliveryCount,
      }
    });
  } catch (error) {
    console.error('Error initiating conversations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Function to load lead status
function loadLeadStatus() {
  console.log('Attempting to load lead status from:', STATUS_FILE_PATH);
  try {
    if (fs.existsSync(STATUS_FILE_PATH)) {
      const data = fs.readFileSync(STATUS_FILE_PATH, 'utf8');
      
      // Check if the file is empty
      if (data.trim() === '') {
        console.log('Lead status file is empty, initializing new object');
        return {};
      }
      
      console.log('Lead status loaded successfully');
      return JSON.parse(data);
    } else {
      console.log('No existing lead status file found, creating a new one');
      fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify({}));
      return {};
    }
  } catch (error) {
    console.error('Error loading lead status:', error);
    return {};
  }
}

// Function to load user assignments for leads
function loadLeadUserAssignments(filePath) {
  return new Promise((resolve, reject) => {
    const assignments = new Map();
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.log('No lead user assignments file found. All leads will use the admin user.');
        return resolve(assignments);
      }
      
      fs.createReadStream(fullPath)
        .pipe(csv({ separator: ';', headers: ['phone', 'userId'] }))
        .on('data', (data) => {
          let { phone, userId } = data;
          
          if (phone && userId) {
            phone = phone.replace(/\D/g, '');
            if (phone.length > 0) {
              assignments.set(phone, userId);
            } else {
              console.warn('Skipping assignment with invalid phone number:', { phone, userId });
            }
          } else {
            console.warn('Skipping invalid assignment:', data);
          }
        })
        .on('end', () => {
          console.log(`Loaded ${assignments.size} lead user assignments`);
          resolve(assignments);
        })
        .on('error', (error) => {
          console.error('Error reading assignments CSV:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in loadLeadUserAssignments:', error);
      resolve(assignments); // Return empty assignments on error
    }
  });
}

// Function to load leads from CSV
function loadLeadsFromCSV(filePath) {
  return new Promise(async (resolve, reject) => {
    const results = [];
    const leadStatus = loadLeadStatus();
    const fullPath = path.join(process.cwd(), filePath);
    
    // Load user assignments
    const userAssignments = await loadLeadUserAssignments('lead_assignments.csv');
    
    try {
      fs.createReadStream(fullPath)
        .pipe(csv({ separator: ';', headers: ['name', 'phone'] }))
        .on('data', (data) => {
          let { name, phone } = data;
          
          if (name && phone) {
            phone = phone.replace(/\D/g, '');
            if (phone.length > 0 && !leadStatus[phone]?.contacted) {
              // Get the assigned user ID for this lead, or default to admin
              const userId = userAssignments.get(phone) || 'admin';
              
              results.push({ name, phone, userId });
              leadInfo.set(phone, { name, userId }); // Store lead info with userId
            } else if (leadStatus[phone]?.contacted) {
              console.log(`Skipping previously contacted lead: ${name} (${phone})`);
            } else {
              console.warn('Skipping lead with invalid phone number:', { name, phone });
            }
          } else {
            console.warn('Skipping invalid lead:', data);
          }
        })
        .on('end', () => {
          console.log(`Loaded ${results.length} valid, uncontacted leads from CSV`);
          resolve(results);
        })
        .on('error', (error) => {
          console.error('Error reading CSV:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error loading CSV:', error);
      reject(error);
    }
  });
}

// Main function to initiate conversations
async function initiateConversations() {
  console.time('Total execution time');

  if (!leads || leads.length === 0) {
    console.log('No leads to process. Exiting initiateConversations.');
    return;
  }

  console.log('Leads loaded:', leads);
  console.log(`Starting to initiate conversations with ${leads.length} leads`);

  let batchNumber = 0;

  while (deliveredConversationCount < MAX_DELIVERED_CONVERSATIONS && initiatedConversationCount < leads.length) {
    batchNumber++;
    const batchSize = Math.min(
      MAX_INITIATED_CONVERSATIONS - initiatedConversationCount,
      MAX_DELIVERED_CONVERSATIONS - deliveredConversationCount,
      leads.length - initiatedConversationCount
    );

    console.time(`Batch ${batchNumber} (${initiatedConversationCount + 1} to ${initiatedConversationCount + batchSize})`);
    console.log(`Initiating batch of ${batchSize} conversations`);

    const batch = leads.slice(initiatedConversationCount, initiatedConversationCount + batchSize);
    await initiateBatch(batch);

    initiatedConversationCount += batchSize;
    pendingDeliveryCount += batchSize;

    console.timeEnd(`Batch ${batchNumber} (${initiatedConversationCount + 1 - batchSize} to ${initiatedConversationCount})`);
    console.log(`Current stats - Initiated: ${initiatedConversationCount}, Delivered: ${deliveredConversationCount}, Pending: ${pendingDeliveryCount}`);

    // Wait for rate limit interval before next batch
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second pause between batches
  }

  // Add a final delay to allow for last status updates
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.timeEnd('Total execution time');
  console.log(`Final stats - Total initiated: ${initiatedConversationCount}, Total delivered: ${deliveredConversationCount}`);
}

// Function to initiate a batch of conversations
async function initiateBatch(batch) {
  const promises = batch.map(async (lead) => {
    try {
      const phoneNumber = lead.phone.replace(/\D/g, '');
      console.log(`Attempting to send message to ${lead.name} (${phoneNumber})`);

      // Get the responsible user for this lead
      const userId = lead.userId || 'admin'; // Default to admin if not specified
      console.log(`Using user ${userId} for sending message to ${lead.name} (${phoneNumber})`);

      // Mark as contacted before sending the message
      await markLeadAsContacted(phoneNumber, 'initiated');
      console.log(`Marked ${lead.name} (${phoneNumber}) as contacted (initiated)`);

      const messageId = await sendWhatsAppTemplateMessageForUser(userId, phoneNumber, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: lead.name }
          ]
        }
      ], 'https://cdn.prod.website-files.com/61c8fe65a3d5862d16a2e8d1/65d8a45e328cb9284e0af640_Yellow%20Modern%20Real%20Estate%20(Flyer).jpg');

      lead.messageId = messageId;
      lead.deliveryStatus = 'pending';
      pendingDeliveryCount++;

      console.log(`Initiated conversation with ${lead.name} (${phoneNumber}). MessageId: ${messageId}`);

      // Update status to 'sent' after successful message send
      await markLeadAsContacted(phoneNumber, 'sent');
      console.log(`Updated ${lead.name} (${phoneNumber}) status to sent`);

    } catch (error) {
      console.error(`Failed to send message to ${lead.name} (${lead.phone}):`, error.message);
      lead.deliveryStatus = 'failed';
      failedDeliveryCount++;
      
      // Even if sending fails, the lead is still marked as contacted
      await markLeadAsContacted(lead.phone, 'failed');
      console.log(`Updated ${lead.name} (${lead.phone}) status to failed`);
    }
  });

  await Promise.all(promises);
  
  printConversationStatistics();
} 