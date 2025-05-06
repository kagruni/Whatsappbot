# WhatsApp API Environment Configuration

To properly configure the WhatsApp API integration, add the following environment variables to your `.env.local` file:

```
# WhatsApp API Configuration
WHATSAPP_API_VERSION=v17.0
NEXT_PUBLIC_API_URL=http://localhost:3000
WHATSAPP_TOKEN=your_whatsapp_api_token_here
```

## Environment Variables

- `WHATSAPP_API_VERSION`: The version of the WhatsApp API to use (e.g., v17.0)
- `NEXT_PUBLIC_API_URL`: The base URL of your application for client-side requests
- `WHATSAPP_TOKEN`: Your WhatsApp Business API token (used as fallback if not set in user settings)

## Token Handling

The WhatsApp token can be configured in two ways:

1. **User-specific token**: In the `user_settings` table, the `whatsapp_token` column stores user-specific tokens
2. **System-wide token**: The `WHATSAPP_TOKEN` environment variable provides a fallback token

The system will first check for a user-specific token and fall back to the environment variable if none is found.

## User Settings Configuration

Required fields in the `user_settings` table:

- `whatsapp_phone_id`: Your WhatsApp Business Phone Number ID
- `whatsapp_template_id`: ID of the approved template to use
- `whatsapp_language`: Language code for the template (e.g., "en_US")

Optional fields:

- `whatsapp_template_image_url`: URL to an image to use in the template header
- `message_limit_24h`: Daily message sending limit per user
- `whatsapp_token`: User-specific WhatsApp API token

## Security Notes

With the server-side implementation:

1. WhatsApp API tokens are no longer exposed in client-side code
2. API requests are properly authenticated through the Next.js server
3. Rate limiting and message quotas are enforced on the server
4. All sensitive operations are performed securely on the backend
5. Detailed error logging helps identify issues without exposing sensitive data

## Authentication Methods

The API supports multiple authentication methods in order of priority:

1. Server-side session (via cookies) - Most secure method
2. User ID passed in request body - Fallback for scenarios where session is not available
3. Admin user fallback - Last resort when neither of the above are available

## WhatsApp Phone Number Verification

The application includes a feature to verify WhatsApp phone numbers using the Cloud API. The process has two steps:

1. **Request Verification Code**:
   - Enter the WhatsApp Phone Number ID (from Meta Developer Portal)
   - Choose SMS or voice call verification method
   - Submit the verification request through the `/api/whatsapp/verify-number` endpoint

2. **Complete Verification**:
   - After receiving the verification code via SMS or voice call
   - Enter the code and submit through the `/api/whatsapp/verify-code` endpoint
   - Upon successful verification, the WhatsApp Phone Number ID is automatically saved to user settings

### Using Already Verified Numbers

If your WhatsApp phone number is already verified in the Meta system (which is common for numbers registered through the Meta Business Manager), you'll receive an error when trying to request a verification code. In this case:

1. You can simply use the "Use Already Verified Number" button to save the Phone Number ID directly to your user settings
2. This skips the verification process since Meta already recognizes your number as verified
3. The Phone Number ID will be immediately available for use in your application

This feature helps users verify their WhatsApp phone numbers directly from the app. The verification process requires:

- WhatsApp Phone Number ID (found in Meta Developer Portal)
- Verification method (SMS or voice)

### API Endpoints

- **POST /api/whatsapp/verify-number**: Initiates the verification process
  - Sends a verification code to the phone associated with the WhatsApp Phone Number ID
  - Uses the Cloud API instead of On-Premises API

- **POST /api/whatsapp/verify-code**: Completes the verification process
  - Verifies the code and confirms the phone number
  - Optionally saves the verified phone number ID to user settings

### Troubleshooting

If you encounter issues with the WhatsApp verification process:
1. Make sure the `WHATSAPP_TOKEN` environment variable is correctly set
2. Verify that you are using the correct WhatsApp Phone Number ID
3. Ensure your Meta Business account has permission to verify phone numbers
4. Check the WhatsApp API logs for detailed error messages

## Error Handling

The API provides detailed error responses:

1. Specific error messages for common issues (template not found, token invalid, etc.)
2. Troubleshooting hints based on error type
3. Appropriate HTTP status codes
4. Comprehensive server-side logging for debugging

## Implementation Details

The WhatsApp API integration uses a server-side approach:

1. Client components make requests to the appropriate API endpoints
2. The server loads credentials from the database, with caching for performance
3. If user-specific token is not available, falls back to environment variable
4. Messages are sent directly from the server to WhatsApp
5. Responses are sanitized before returning to the client
6. Database is updated with message status and user information

This approach eliminates the security vulnerability of exposing API tokens in the client-side code while maintaining all existing functionality.

## WhatsApp Phone Number Registration

The application includes a feature to register WhatsApp phone numbers that have already been verified in the Meta system. This is necessary for verified numbers that need to be bound with a certificate.

### Registration Process

1. **Gather Required Information**:
   - WhatsApp Phone Number ID (found in Meta Developer Portal)
   - Certificate for the phone number (from WhatsApp Manager)
   - Two-Step Verification PIN (if enabled)

2. **Register the Phone Number**:
   - Enter the WhatsApp Phone Number ID and certificate
   - Submit the registration request through the `/api/whatsapp/verify-number` endpoint
   - Upon successful registration, the WhatsApp Phone Number ID is saved to user settings

### Binding Certificates to Verified Numbers

When a WhatsApp number is already verified in the Meta system, you'll need to bind it with a certificate rather than going through the verification process again. This is a common requirement for numbers registered through the Meta Business Manager.

To get your certificate:
1. Go to WhatsApp Manager in your Meta Business Account
2. Navigate to Account Tools > Phone Numbers
3. Find your verified phone number and click on it
4. In the dialog that appears, click "Get Certificate"
5. Copy the base64-encoded certificate string

The registration process uses the `/phone_number_id/register` Cloud API endpoint to bind the certificate to the number, allowing your application to use this WhatsApp number for messaging.

### Skipping Registration

In some cases, you may already have the Phone Number ID and don't need to go through the registration process again. In this case:

1. You can use the "Skip Registration" button to save the Phone Number ID directly to your user settings
2. This bypasses the registration process since you're only saving the ID for reference
3. The Phone Number ID will be immediately available for use in your application 