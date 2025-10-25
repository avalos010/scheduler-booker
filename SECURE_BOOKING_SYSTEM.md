# Secure Booking Details System

## Overview

This document explains the secure booking details system that allows clients to view and manage their bookings through email links without requiring authentication, while preventing unauthorized access.

## How It Works

### Security Architecture

Instead of using predictable booking IDs in URLs (which could be guessed or enumerated), the system uses **unique, random access tokens** (UUIDs) for each booking:

```
❌ Insecure: /bookings/123
✅ Secure:   /booking/a7f9d3e2-8c4b-4a5e-9f1d-2b8c3d4e5f6a
```

### Key Security Features

1. **Unguessable Tokens**: Each booking gets a UUID (128-bit random identifier) as an access token
2. **Token-Based Access**: Users need the exact token to view booking details
3. **No Authentication Required**: Clients can access their bookings from email without logging in
4. **Database-Level Security**: Access tokens are indexed for fast lookup and secured with RLS policies
5. **Limited Scope**: Tokens only grant access to a single booking

## Database Changes

### New Field: `access_token`

Added to the `bookings` table:

```sql
access_token UUID DEFAULT gen_random_uuid()
```

- Automatically generated for each new booking
- Unique and unguessable (128-bit UUID)
- Indexed for fast lookups
- Never exposed in client-side code except in the booking link

### Migration

The migration automatically:

- Adds the `access_token` column to existing tables
- Generates tokens for all existing bookings
- Creates an index on `access_token` for performance
- Adds RLS policy for public token-based access

To apply the migration, run:

```bash
# Apply to your Supabase instance
# Copy the SQL from supabase-migrations.sql and run in Supabase SQL Editor
```

## API Endpoints

### 1. Public Booking Creation

**Endpoint**: `POST /api/bookings/public-create`

Returns the access token when creating a booking:

```json
{
  "message": "Booking created successfully",
  "booking": { ... },
  "accessToken": "a7f9d3e2-8c4b-4a5e-9f1d-2b8c3d4e5f6a"
}
```

### 2. View Booking by Token

**Endpoint**: `GET /api/bookings/public-view?token={token}`

Fetches booking details using the access token. No authentication required.

**Response**:

```json
{
  "booking": {
    "id": "...",
    "date": "2024-03-15",
    "start_time": "...",
    "end_time": "...",
    "client_name": "John Doe",
    "client_email": "john@example.com",
    "status": "pending",
    ...
  }
}
```

### 3. Update Booking by Token

**Endpoint**: `PATCH /api/bookings/public-view`

Updates booking information (name, email, phone, notes) using the access token.

**Request Body**:

```json
{
  "token": "a7f9d3e2-8c4b-4a5e-9f1d-2b8c3d4e5f6a",
  "clientName": "John Doe Updated",
  "clientEmail": "john.new@example.com",
  "clientPhone": "555-0123",
  "notes": "Updated notes"
}
```

### 4. Cancel Booking by Token

**Endpoint**: `DELETE /api/bookings/public-view?token={token}`

Cancels a booking using the access token.

## User Flow

### 1. Client Creates Booking

```typescript
// PublicBookingForm.tsx
const result = await createPublicBookingMutation.mutateAsync({...});

if (result.accessToken) {
  const link = `${window.location.origin}/booking/${result.accessToken}`;
  // Display link to user
}
```

The client receives a secure link like:

```
https://yourapp.com/booking/a7f9d3e2-8c4b-4a5e-9f1d-2b8c3d4e5f6a
```

### 2. Client Receives Email

When you send confirmation emails, include the secure link:

```html
Dear John, Your booking has been confirmed for March 15, 2024 at 2:00 PM. View
or manage your booking:
https://yourapp.com/booking/a7f9d3e2-8c4b-4a5e-9f1d-2b8c3d4e5f6a Best regards,
Your Business
```

### 3. Client Accesses Booking

When clients click the link:

1. They're taken to `/booking/[token]` page
2. No login required
3. Can view all booking details
4. Can edit their contact information
5. Can cancel the booking

## Frontend Implementation

### Public Booking Details Page

**Location**: `/src/app/booking/[token]/page.tsx`

**Features**:

- View booking details (date, time, client info, notes)
- Edit contact information (name, email, phone, notes)
- Cancel booking
- Status-based permissions (can't edit/cancel completed bookings)
- Beautiful, responsive UI with status badges
- Confirmation modal for cancellations

### Updated Booking Form

**Location**: `/src/components/bookings/PublicBookingForm.tsx`

**Changes**:

- Displays secure booking link after successful creation
- Copy-to-clipboard functionality
- Clear instructions to save the link

## Security Considerations

### What's Secure

✅ **Unguessable tokens**: 128-bit UUIDs are cryptographically random  
✅ **No enumeration**: Can't iterate through bookings  
✅ **Single booking access**: Token only works for one booking  
✅ **Automatic generation**: Tokens created by database, not user input  
✅ **No authentication needed**: Convenient for clients

### What's NOT Protected

⚠️ **Token sharing**: Anyone with the link can access the booking  
⚠️ **Email security**: If email is compromised, token is exposed  
⚠️ **No expiration**: Tokens are permanent (you may want to add expiry)

### Best Practices

1. **Email Security**:

   - Only send links to verified email addresses
   - Use secure email providers
   - Consider using encrypted email for sensitive bookings

2. **Token Handling**:

   - Never log tokens in client-side console
   - Don't include tokens in analytics
   - Don't expose tokens in URLs on public pages (use POST for sensitive operations)

3. **Additional Security Layers** (Optional):
   - Add token expiration dates
   - Require email verification for sensitive actions
   - Implement rate limiting on token-based endpoints
   - Add IP-based rate limiting

## Testing

### Manual Testing

1. **Create a booking** through the public form
2. **Copy the secure link** shown after creation
3. **Open the link** in a new incognito window
4. **Verify** you can:

   - View booking details
   - Edit your information
   - Cancel the booking

5. **Test invalid tokens**:
   - Try `/booking/invalid-token-123`
   - Should show "Booking Not Found"

### Automated Testing

Consider adding tests for:

- Token generation on booking creation
- Fetching booking by valid token
- Rejecting invalid tokens
- Updating booking via token
- Cancelling booking via token
- Preventing updates to cancelled/completed bookings

## Email Integration

### Recommended Email Service

Use services like:

- SendGrid
- AWS SES
- Mailgun
- Postmark

### Example Email Template

```typescript
// Example function to send booking confirmation
async function sendBookingConfirmation(booking: Booking, accessToken: string) {
  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking/${accessToken}`;

  await emailService.send({
    to: booking.client_email,
    subject: `Booking Confirmation - ${booking.date}`,
    html: `
      <h1>Your Booking is Confirmed</h1>
      <p>Dear ${booking.client_name},</p>
      
      <p>Your appointment has been confirmed:</p>
      <ul>
        <li>Date: ${booking.date}</li>
        <li>Time: ${booking.start_time} - ${booking.end_time}</li>
      </ul>
      
      <p>
        <a href="${bookingLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          View Booking Details
        </a>
      </p>
      
      <p><small>Save this link to view or manage your booking anytime.</small></p>
    `,
  });
}
```

## Future Enhancements

### Potential Improvements

1. **Token Expiration**

   - Add `access_token_expires_at` column
   - Automatically expire tokens after X days
   - Generate new token if needed

2. **Email Verification**

   - Require email confirmation for sensitive actions
   - Send verification codes for cancellations

3. **Booking History**

   - Track all changes made via token access
   - Log IP addresses and timestamps

4. **QR Codes**

   - Generate QR codes for booking links
   - Easy mobile access

5. **Calendar Integration**

   - Add to Calendar buttons (.ics files)
   - Automatic calendar invites

6. **Reminders**
   - Automated email reminders before appointments
   - Include booking link in reminders

## Troubleshooting

### Token Not Working

**Symptoms**: "Booking Not Found" error

**Possible Causes**:

1. Token not generated (check database)
2. Token malformed in URL
3. Database migration not applied
4. RLS policies blocking access

**Solution**:

```sql
-- Check if token exists
SELECT id, access_token, client_email
FROM bookings
WHERE access_token = 'your-token-here';

-- Verify RLS policy
SELECT * FROM pg_policies
WHERE tablename = 'bookings'
AND policyname = 'Anyone can view booking with valid access token';
```

### Can't Update Booking

**Symptoms**: Update fails silently or with error

**Possible Causes**:

1. Booking status is "cancelled" or "completed"
2. Invalid token
3. Network error

**Solution**:

- Check booking status
- Verify token in request
- Check browser console for errors

## Summary

This secure booking system provides a perfect balance between:

- **Security**: Unguessable tokens prevent unauthorized access
- **Convenience**: No login required for clients
- **Functionality**: Full CRUD operations on bookings
- **User Experience**: Beautiful, intuitive interface

The system is production-ready and follows modern security best practices for public-facing booking management.
