# 📅 Booking System

This document explains how to use the new booking system in the scheduler application.

## 🚀 Features

- **Date Selection**: Choose from available dates (next 30 days)
- **Time Slot Selection**: View and select available time slots for each date
- **Client Information**: Collect client details (name, email, phone, notes)
- **Pending Approval Workflow**: All new bookings start as "pending" and require user approval
- **Status Management**: Accept, decline, or manage booking statuses from the Appointments tab
- **Automatic Slot Management**: Time slots are only marked as booked after confirmation

## 🏗️ Architecture

### Database Tables

1. **`bookings`** - Stores all booking information

   - Client details (name, email, phone, notes)
   - Appointment details (date, start time, end time)
   - Status tracking (confirmed, cancelled, completed, no-show)

2. **`user_time_slots`** - Manages availability and booking status
   - Tracks which slots are available vs. booked
   - Automatically updated when bookings are created

### API Endpoints

- **`POST /api/bookings`** - Create new bookings (status: pending)
- **`GET /api/bookings?userId={id}`** - Retrieve user's bookings
- **`PATCH /api/bookings`** - Update booking status (accept/decline/complete)

## 📱 How to Use

### 1. Access the Booking Page

Navigate to `/dashboard/bookings` in your application.

### 2. Select a Date

- Choose from the calendar showing the next 30 days
- Past dates are automatically disabled
- Click on any available date to view time slots

### 3. Choose a Time Slot

- Available time slots are displayed in a grid
- Only working days with available slots are shown
- Click on a time slot to select it

### 4. Fill in Client Information

Required fields:

- **Client Name** - Full name of the client
- **Client Email** - Email address for notifications

Optional fields:

- **Client Phone** - Phone number for contact
- **Notes** - Any special requirements or notes

### 5. Create the Booking

Click the "Book [Time] - [Time]" button to create the appointment.

### 6. Approve the Booking

- New bookings are created with "pending" status
- Navigate to the **Appointments** tab to review pending bookings
- Click "Accept" to confirm the appointment (marks time slot as booked)
- Click "Decline" to reject the booking (frees up the time slot)

## 🔧 Technical Details

### Component Structure

- **`BookingForm`** - Main form component with date/time selection and client form
- **`BookingsPage`** - Page wrapper with authentication and layout
- **`AppointmentsList`** - Component to view and manage all appointments
- **`AppointmentsPage`** - Page to display the appointments list
- **API Routes** - Server-side endpoints for data management and status updates

### State Management

- Uses React hooks for local state management
- Fetches availability data from existing API endpoints
- Updates time slot status when bookings are created

### Security

- Server-side authentication verification
- Row-level security (RLS) policies on all tables
- Users can only access their own booking data

## 🧪 Testing

Run the test suite:

```bash
npm test -- --testPathPatterns=BookingForm.simple.test.tsx
```

Tests cover:

- Component rendering
- Date selection
- Time slot selection
- Client form display

## 🚧 Future Enhancements

- **Email Notifications** - Automatic confirmation emails to clients when bookings are accepted
- **Recurring Bookings** - Support for weekly/monthly recurring appointments
- **Calendar Integration** - Sync with external calendar systems
- **Payment Processing** - Integration with payment gateways
- **Client Portal** - Allow clients to book directly through a public link
- **SMS Notifications** - Text message confirmations for appointments

## 📋 Database Migration

The booking system requires the following database changes:

```sql
-- Add bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- Policies are automatically created in the migration file
```

## 🔍 Troubleshooting

### Common Issues

1. **Time slots not showing**: Ensure working hours are set for the selected date
2. **Booking creation fails**: Check that the time slot is still available
3. **Authentication errors**: Verify user is logged in and has proper permissions

### Debug Mode

Enable debug logging in the browser console to see detailed API calls and responses.
