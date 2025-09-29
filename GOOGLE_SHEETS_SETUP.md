# Google Sheets Integration Setup Guide

This guide will help you set up the Google Sheets integration for your WhatsApp Message Management System.

## Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the content from `google-apps-script-code.js`
4. Save the project with a meaningful name like "WhatsApp Message Manager"

## Step 2: Deploy as Web App

1. In the Apps Script editor, click "Deploy" > "New deployment"
2. Click the gear icon next to "Type" and select "Web app"
3. Configure the deployment:
   - **Description**: WhatsApp Message Manager API
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone (or "Anyone with Google account" for slightly more security)
4. Click "Deploy"
5. **Important**: Copy the "Web app URL" - you'll need this for your React app

## Step 3: Update React Application

1. Open `src/pages/SequenceMessagesPage.tsx`
2. Find the line with `const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';`
3. Replace `YOUR_SCRIPT_ID` with the actual script ID from your Web App URL

## Step 4: Create Google Sheet

1. Create a new Google Sheet
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
3. The script will automatically create a "WhatsApp Messages" sheet with proper headers

## Step 5: Configure in Application

1. Go to Settings in your application
2. Paste the Google Sheet ID in the "Google Sheet ID" field
3. Save the settings

## Step 6: Test the Integration

1. Go to the Sequence Messages page
2. Ensure you have some pending messages
3. Click "Send to Sheet" button
4. Check your Google Sheet to verify the messages were exported

## Features

### Automatic Sheet Creation
- The script automatically creates a "WhatsApp Messages" sheet if it doesn't exist
- Headers are added and formatted automatically

### Duplicate Prevention
- Messages are checked against existing entries to prevent duplicates
- Duplicate detection uses phone number + date + first 50 characters of message

### Status Management
- New messages are added with "Pending" status
- Messages marked as "Sent" in the sheet are automatically cleaned up
- App updates message status to "Sent" after successful export

### Error Handling
- Comprehensive error handling for API failures
- User-friendly error messages in the application
- Detailed logging in Google Apps Script

## Troubleshooting

### Common Issues

1. **"Script not found" error**
   - Verify the Web App URL is correct
   - Ensure the script is deployed as a Web App
   - Check that access is set to "Anyone"

2. **"Permission denied" error**
   - Make sure the Google Sheet is accessible
   - Verify the Sheet ID is correct
   - Check that the script has permission to access Google Sheets

3. **"Invalid payload" error**
   - Ensure the Google Sheet ID is configured in Settings
   - Verify there are pending messages to export

### Testing the Script

You can test the Google Apps Script directly:

1. Open the Apps Script editor
2. Replace `YOUR_SHEET_ID_HERE` in the `testScript()` function with your actual Sheet ID
3. Run the `testScript()` function
4. Check the execution log for results

## Security Considerations

- The Web App is deployed with "Anyone" access for simplicity
- For production use, consider using "Anyone with Google account" for better security
- The script only accesses the specific Google Sheet you provide
- No sensitive data is stored in the script

## Maintenance

- The script automatically handles sheet formatting and cleanup
- Monitor the execution log in Apps Script for any errors
- Consider setting up email notifications for script failures in Apps Script settings