# Time Format Architecture

This document explains how time formatting works in the scheduler application, particularly the design decision to store times in 24-hour format in the database while providing flexible display options.

## Overview

The application uses a **database-driven time formatting system** where:
- All times are stored in **24-hour format** in the database (e.g., `"09:00:00"`, `"17:30:00"`)
- User preferences for display format (12-hour vs 24-hour) are stored in the database
- APIs conditionally format times based on user preferences
- Frontend components receive pre-formatted display strings from the API

## Database Storage Strategy

### Why 24-Hour Format in Database?

1. **Consistency**: Eliminates ambiguity (no AM/PM confusion)
2. **Sorting**: Natural chronological ordering works correctly
3. **Calculations**: Time arithmetic is straightforward
4. **Internationalization**: 24-hour is the ISO standard
5. **Data Integrity**: Single source of truth for actual time values

### Database Schema

```sql
-- Working hours stored in 24-hour format
CREATE TABLE user_working_hours (
  start_time TIME,  -- e.g., '09:00:00'
  end_time TIME,    -- e.g., '17:00:00'
  ...
);

-- User preference for display format
CREATE TABLE user_availability_settings (
  time_format_12h BOOLEAN DEFAULT false,  -- true = 12-hour, false = 24-hour
  ...
);

-- Time slots stored in 24-hour format
CREATE TABLE user_time_slots (
  start_time TIME,  -- e.g., '14:30:00'
  end_time TIME,    -- e.g., '15:30:00'
  ...
);
```

## API-Level Formatting

### How It Works

1. **API reads user preference** from `user_availability_settings.time_format_12h`
2. **If user prefers 12-hour format**, API adds formatted display fields
3. **API response includes both raw and formatted times**

### Example API Response

```json
{
  "timeSlots": [
    {
      "id": "slot-1",
      "startTime": "09:00:00",           // Raw 24-hour (always present)
      "endTime": "10:00:00",             // Raw 24-hour (always present)
      "startTimeDisplay": "9:00 AM",     // Formatted (only if 12-hour preference)
      "endTimeDisplay": "10:00 AM",      // Formatted (only if 12-hour preference)
      "isAvailable": true
    }
  ]
}
```

### Affected Endpoints

- `/api/availability/day-details` - Time slot formatting
- `/api/availability/working-hours` - Working hours formatting

## Client-Side Implementation

### Display Logic

Frontend components use this priority order:

1. **API-formatted display fields** (e.g., `startTimeDisplay`)
2. **Fallback to client-side formatting** using `clientTimeFormat.ts`

```typescript
// Component usage example
const displayTime = slot.startTimeDisplay || formatTime(slot.startTime, is24Hour);
```

### File Organization

```
src/lib/utils/
├── serverTimeFormat.ts    # Server-side formatting (API routes)
├── clientTimeFormat.ts    # Client-side formatting + preferences hook
└── __tests__/
    └── clientTimeFormat.test.ts
```

## Benefits of This Architecture

### 1. Performance
- **Reduced client-side processing**: Times pre-formatted by API
- **Consistent formatting**: All times formatted using same server logic
- **Fewer client requests**: Preference fetched once by API

### 2. Consistency
- **Single source of truth**: Database preference drives all formatting
- **No formatting conflicts**: Server and client always agree
- **Reliable updates**: Preference changes reflect immediately

### 3. Maintainability
- **Centralized logic**: Time formatting rules in one place (server)
- **Type safety**: TypeScript interfaces include display fields
- **Clear separation**: Server utilities vs client utilities

### 4. User Experience
- **Instant formatting**: No loading flicker for formatted times
- **Persistent preferences**: Saved in database, not localStorage
- **Cross-device sync**: Preferences follow user across devices

## Implementation Details

### Server-Side Formatting (`serverTimeFormat.ts`)

```typescript
export function formatTime(timeString: string, is24Hour: boolean): string {
  // Handles both "HH:mm" and "HH:mm:ss" input formats
  // Returns "h:mm a" for 12-hour or "HH:mm" for 24-hour
}
```

### Client-Side Hook (`clientTimeFormat.ts`)

```typescript
export function useTimeFormatPreference() {
  // Loads preference from API endpoint
  // Provides formatting function for fallback cases
  // Handles saving preference changes
}
```

### Data Transformation

The `useAvailabilityData` hook transforms API responses:

```typescript
// Maps snake_case API fields to camelCase component props
{
  startTime: wh.start_time,
  endTime: wh.end_time,
  startTimeDisplay: wh.start_time_display,  // New display fields
  endTimeDisplay: wh.end_time_display,      // New display fields
}
```

## Migration Considerations

### Existing Data
- No migration needed for time values (already in correct format)
- New `time_format_12h` column defaults to `false` (24-hour format)
- Existing users see 24-hour format until they change preference

### Backward Compatibility
- Raw time fields (`startTime`, `endTime`) always present
- Display fields (`startTimeDisplay`, `endTimeDisplay`) optional
- Components gracefully handle missing display fields

## Testing Strategy

### Server-Side Tests
- Time parsing with various input formats
- Correct formatting for both 12-hour and 24-hour output
- Edge cases (midnight, noon, single-digit hours)

### Client-Side Tests
- Preference loading and saving
- Fallback formatting when API doesn't provide display fields
- Component integration with formatted times

### Integration Tests
- End-to-end preference changes
- API formatting with real database data
- Cross-component consistency

## Future Enhancements

### Timezone Support
The architecture supports adding timezone formatting:

```typescript
// Future enhancement
export function formatTimeWithTimezone(
  timeString: string, 
  is24Hour: boolean, 
  timezone: string
): string {
  // Convert to user's timezone before formatting
}
```

### Locale-Specific Formatting
```typescript
// Future enhancement
export function formatTimeWithLocale(
  timeString: string, 
  is24Hour: boolean, 
  locale: string
): string {
  // Use locale-specific formatting rules
}
```

## Troubleshooting

### Common Issues

1. **Times showing as 24-hour despite preference**
   - Check if API is returning `startTimeDisplay` fields
   - Verify `time_format_12h` preference in database
   - Ensure component is using display fields

2. **Format parsing errors**
   - Both server and client utilities handle `HH:mm:ss` format
   - Check console for parsing warnings
   - Verify input time format matches expected patterns

3. **Preference not saving**
   - Check `/api/user/time-format` endpoint
   - Verify database unique constraint on `user_id`
   - Check authentication in API requests

### Debug Tools

Enable debug logging:
```typescript
// In API routes
console.log("Should format times?", shouldUse12HourFormat);

// In components  
console.log("Time preference:", { is24Hour, hasDisplayFields });
```
