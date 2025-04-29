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

With the new server-side implementation:

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

## Error Handling

The API provides detailed error responses:

1. Specific error messages for common issues (template not found, token invalid, etc.)
2. Troubleshooting hints based on error type
3. Appropriate HTTP status codes
4. Comprehensive server-side logging for debugging

## Implementation Details

The WhatsApp API integration now uses a server-side approach:

1. Client components make requests to `/api/whatsapp/send-template` endpoint
2. The server loads credentials from the database, with caching for performance
3. If user-specific token is not available, falls back to environment variable
4. Messages are sent directly from the server to WhatsApp
5. Responses are sanitized before returning to the client
6. Database is updated with message status and lead information

This approach eliminates the security vulnerability of exposing API tokens in the client-side code while maintaining all existing functionality. 