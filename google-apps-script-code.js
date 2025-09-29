/**
 * Google Apps Script Web App for WhatsApp Message Management
 * 
 * This script handles POST requests from your React application to:
 * 1. Export pending WhatsApp messages to Google Sheets
 * 2. Update message statuses
 * 3. Handle duplicate entries
 * 
 * Deploy this as a Web App with:
 * - Execute as: Me
 * - Who has access: Anyone (or Anyone with Google account)
 */

function doPost(e) {
  try {
    // Parse the incoming JSON payload
    const data = JSON.parse(e.postData.contents);
    const { googleSheetId, messages } = data;
    
    if (!googleSheetId || !messages || !Array.isArray(messages)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Invalid payload: googleSheetId and messages array are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the Google Sheet
    const spreadsheet = SpreadsheetApp.openById(googleSheetId);
    let sheet = spreadsheet.getSheetByName('WhatsApp Messages');
    
    // Create the sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet('WhatsApp Messages');
      // Add headers
      sheet.getRange(1, 1, 1, 5).setValues([
        ['Phone Number', 'Message Content', 'Patient Name', 'Scheduled Date', 'Status']
      ]);
      // Format headers
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    // Get existing data to check for duplicates
    const existingData = sheet.getDataRange().getValues();
    const existingMessages = new Set();
    
    // Create a set of existing messages (phone + date + first 50 chars of message)
    for (let i = 1; i < existingData.length; i++) {
      const [phone, messageContent, , scheduledDate] = existingData[i];
      const key = `${phone}_${scheduledDate}_${messageContent.substring(0, 50)}`;
      existingMessages.add(key);
    }
    
    // Prepare new rows to add
    const newRows = [];
    let duplicateCount = 0;
    
    for (const message of messages) {
      const key = `${message.phoneNumber}_${message.scheduledDate}_${message.messageContent.substring(0, 50)}`;
      
      if (!existingMessages.has(key)) {
        newRows.push([
          message.phoneNumber,
          message.messageContent,
          message.patientName,
          message.scheduledDate,
          message.status
        ]);
      } else {
        duplicateCount++;
      }
    }
    
    // Add new rows if any
    if (newRows.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, newRows.length, 5).setValues(newRows);
      
      // Auto-resize columns for better readability
      sheet.autoResizeColumns(1, 5);
      
      // Clear existing row banding before applying new banding
      clearRowBanding(sheet);
      
      // Add alternating row colors for better readability
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5);
      if (dataRange.getNumRows() > 0) {
        dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
      }
    }
    
    // Clean up sent messages (optional - remove rows where status is "Sent")
    cleanupSentMessages(sheet);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `Successfully processed ${messages.length} messages`,
        newMessages: newRows.length,
        duplicates: duplicateCount
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Clear all existing row banding from the sheet
 * This prevents the "alternating background colors already exist" error
 */
function clearRowBanding(sheet) {
  try {
    // Get all existing bandings on the sheet
    const bandings = sheet.getBandings();
    
    // Remove each banding
    for (const banding of bandings) {
      banding.remove();
    }
    
    console.log(`Cleared ${bandings.length} existing row bandings`);
  } catch (error) {
    console.error('Error clearing row banding:', error);
    // Continue execution even if clearing fails
  }
}

/**
 * Clean up messages that have been marked as "Sent"
 * This function removes rows where the status column contains "Sent"
 */
function cleanupSentMessages(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    
    // Find rows with "Sent" status (column 5, index 4)
    for (let i = data.length - 1; i >= 1; i--) { // Start from bottom to avoid index issues
      if (data[i][4] && data[i][4].toString().toLowerCase().includes('sent')) {
        rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
      }
    }
    
    // Delete rows (from bottom to top to maintain correct indices)
    for (const rowIndex of rowsToDelete) {
      sheet.deleteRow(rowIndex);
    }
    
    console.log(`Cleaned up ${rowsToDelete.length} sent messages`);
  } catch (error) {
    console.error('Error cleaning up sent messages:', error);
  }
}

/**
 * Handle GET requests to the Web App
 * This function responds to direct browser access or GET requests to your Web App URL
 * 
 * @param {Object} e - The event object containing request parameters
 * @returns {ContentService.TextOutput} - JSON response indicating the service is active
 */
function doGet(e) {
  try {
    // You can access URL parameters via e.parameter
    // For example: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=status
    const action = e.parameter.action || 'default';
    
    let response = {
      success: true,
      message: 'WhatsApp Message Manager API is active',
      timestamp: new Date().toISOString(),
      action: action
    };
    
    // Handle different actions if needed
    switch (action) {
      case 'status':
        response.message = 'Service is running normally';
        response.version = '1.0.0';
        break;
      case 'health':
        response.message = 'Health check passed';
        response.status = 'healthy';
        break;
      default:
        response.message = 'WhatsApp Message Manager API is active. Use POST requests to send data.';
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Error processing GET request'
      }, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function to verify the script works
 * You can run this function manually in the Apps Script editor
 */
function testScript() {
  const testData = {
    googleSheetId: 'YOUR_SHEET_ID_HERE', // Replace with your actual sheet ID
    messages: [
      {
        id: 'test-1',
        phoneNumber: '9876543210',
        messageContent: 'Hello, this is a test message for diabetes awareness.',
        patientName: 'Test Patient',
        scheduledDate: '2025-01-20',
        status: 'Pending'
      }
    ]
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

/**
 * Function to get the Web App URL after deployment
 * This is just for reference - you'll get the actual URL when you deploy
 */
function getWebAppInfo() {
  console.log('After deploying as Web App, you will get a URL like:');
  console.log('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
  console.log('Replace YOUR_SCRIPT_ID in your React app with the actual script ID from the URL');
}