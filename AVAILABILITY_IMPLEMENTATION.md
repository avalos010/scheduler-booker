# Availability Settings Database Integration

## Overview

The availability settings system has been successfully integrated with Supabase database. Users can now save and load their availability preferences, working hours, and time slot settings.

## Database Schema

The following tables were created from `supabase-migrations.sql`:

### 1. `user_availability_settings`

- `slot_duration_minutes`: Duration of each time slot (15, 30, 45, 60, 90, 120 minutes)
- `break_duration_minutes`: Duration of breaks between appointments (0, 15, 30, 45, 60 minutes)
- `advance_booking_days`: How many days in advance clients can book (1-365 days)

### 2. `user_working_hours`

- `day_of_week`: 0=Sunday, 1=Monday, ..., 6=Saturday
- `start_time`: Working start time (e.g., "09:00")
- `end_time`: Working end time (e.g., "17:00")
- `is_working`: Whether this day is a working day

### 3. `user_availability_exceptions`

- `date`: Specific date for exception
- `is_available`: Whether available on this date
- `reason`: Optional reason for the exception

### 4. `user_time_slots`

- `date`: Specific date
- `start_time`: Slot start time
- `end_time`: Slot end time
- `is_available`: Whether slot is available
- `is_booked`: Whether slot is already booked

## Features Implemented

### ✅ Database Integration

- **Automatic Loading**: Settings and working hours are loaded from database on component mount
- **Default Values**: If no settings exist, default values are automatically created
- **Real-time Saving**: All changes are immediately saved to the database
- **Error Handling**: Graceful error handling with user feedback

### ✅ Working Hours Management

- **Day-by-day Configuration**: Set working hours for each day of the week
- **Toggle Working Days**: Enable/disable specific days
- **Time Range Selection**: Custom start and end times for each day
- **Default Schedule**: Monday-Friday 9 AM - 5 PM, weekends off

### ✅ Time Slot Configuration

- **Flexible Durations**: 15, 30, 45, 60, 90, or 120-minute slots
- **Break Management**: Configurable breaks between appointments
- **Advance Booking**: Set how many days ahead clients can book

### ✅ User Experience

- **Loading States**: Visual feedback during save operations
- **Success/Error Messages**: Clear feedback for all operations
- **Responsive Design**: Works on all device sizes
- **Real-time Updates**: Changes reflect immediately in the UI

## How It Works

### 1. Initial Load

```typescript
useEffect(() => {
  if (user) {
    loadAvailability(); // Loads from database or creates defaults
  }
}, [user, loadAvailability]);
```

### 2. Save Operation

```typescript
const handleSaveSettings = async () => {
  setIsSaving(true);
  const result = await saveAvailability();
  if (result.success) {
    setSaveMessage({ type: "success", text: "Settings saved successfully!" });
  } else {
    setSaveMessage({ type: "error", text: `Failed to save: ${result.error}` });
  }
  setIsSaving(false);
};
```

### 3. Database Operations

- **Upsert**: Uses `ON CONFLICT` to update existing records or insert new ones
- **Row Level Security**: Users can only access their own data
- **Automatic Timestamps**: `created_at` and `updated_at` are managed automatically

## Testing

The implementation includes comprehensive tests covering:

- ✅ Loading settings from database
- ✅ Creating default settings when none exist
- ✅ Saving settings to database
- ✅ Error handling for database failures

Run tests with:

```bash
npm test -- --testPathPatterns=useAvailability.simple.test.tsx
```

## Usage

### For Users

1. Navigate to `/dashboard/availability`
2. Configure working hours for each day
3. Set time slot duration and break preferences
4. Configure advance booking window
5. Click "Save Settings" to persist changes

### For Developers

```typescript
import { useAvailability } from "@/lib/hooks/useAvailability";

const {
  settings,
  workingHours,
  updateSettings,
  updateWorkingHours,
  saveAvailability,
} = useAvailability();

// Update a setting
updateSettings({ slotDuration: 90 });

// Update working hours
updateWorkingHours(0, "startTime", "08:00");

// Save to database
const result = await saveAvailability();
```

## Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Input Validation**: All inputs are validated before database operations
- **SQL Injection Protection**: Uses Supabase's parameterized queries

## Performance Considerations

- **Indexed Queries**: Database indexes on frequently queried columns
- **Efficient Loading**: Only loads necessary data on mount
- **Optimistic Updates**: UI updates immediately, database syncs in background
- **Minimal Re-renders**: Uses React's `useCallback` for stable references

## Future Enhancements

- **Bulk Operations**: Copy schedules between weeks
- **Calendar Integration**: Import/export with external calendars
- **Recurring Exceptions**: Set recurring unavailable dates
- **Team Scheduling**: Coordinate with team members
- **Analytics**: Track booking patterns and optimize availability

## Troubleshooting

### Common Issues

1. **Settings not saving**: Check user authentication status
2. **Working hours not loading**: Verify database connection
3. **Permission errors**: Ensure RLS policies are correctly configured

### Debug Mode

Enable console logging to see database operations:

```typescript
// In development, database operations are logged
console.log("Saving settings:", settings);
console.log("Database result:", result);
```

## Conclusion

The availability settings system is now fully functional with database persistence. Users can configure their schedules, and all changes are automatically saved to Supabase. The system handles edge cases gracefully and provides a smooth user experience.
