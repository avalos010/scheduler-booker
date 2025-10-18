# Holiday Integration for Availability Calendar

This implementation adds automatic holiday detection and display to both the availability calendar and booking calendar using the `date-holidays` library.

## Features

✅ **Automatic Holiday Detection**: Uses the `date-holidays` library to automatically detect holidays for any country/region
✅ **Calendar Integration**: Holidays are displayed on both availability and booking calendars
✅ **Country/Region Support**: Supports holidays for 200+ countries and regions
✅ **Visual Indicators**: Holidays are marked with 🎉 emoji and red text
✅ **Settings Integration**: Users can configure their country and region for accurate holiday detection

## How It Works

### 1. Holiday Service (`src/lib/services/holidayService.ts`)

The `HolidayService` class provides:

- `isHoliday(date)` - Check if a specific date is a holiday
- `getHolidayInfo(date)` - Get detailed holiday information for a date
- `getHolidaysForYear(year)` - Get all holidays for a year
- `getHolidaysInRange(startDate, endDate)` - Get holidays within a date range
- `getAvailableCountries()` - Get list of supported countries
- `getAvailableStates()` - Get list of supported states/regions for a country

### 2. Calendar Integration

**Availability Calendar** (`src/components/availability/AvailabilityCalendar.tsx`):

- Shows holiday name in mobile view: "🎉 Christmas Day"
- Shows holiday emoji in desktop view: 🎉
- Added to calendar legend

**Booking Calendar** (`src/components/bookings/SharedAvailabilityCalendar.tsx`):

- Shows holiday name in time slot header: "Available Time Slots for Monday, December 25, 2023 🎉 Christmas Day"

### 3. Data Structure Updates

**DayAvailability Interface** (`src/lib/types/availability.ts`):

```typescript
interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
  holiday?: {
    name: string;
    type: string;
    country: string;
  };
}
```

**AvailabilitySettings Interface**:

```typescript
interface AvailabilitySettings {
  slotDuration: number;
  advanceBookingDays: number;
  timeFormat12h?: boolean;
  holidaySettings?: {
    country: string;
    state?: string;
    region?: string;
    showHolidays: boolean;
  };
}
```

### 4. Holiday Settings Component

The `HolidaySettings` component (`src/components/availability/HolidaySettings.tsx`) provides:

- Toggle to enable/disable holiday display
- Country selection dropdown
- State/region selection (when available)
- Information about holiday detection

## Usage Examples

### Basic Usage

```typescript
import { HolidayService } from "@/lib/services/holidayService";

// Create service for US holidays
const holidayService = new HolidayService({ country: "US" });

// Check if a date is a holiday
const isHoliday = holidayService.isHoliday(new Date("2024-12-25")); // true

// Get holiday information
const holidayInfo = holidayService.getHolidayInfo(new Date("2024-12-25"));
// Returns: { name: 'Christmas Day', date: Date, type: 'public', country: 'US' }
```

### With State/Region

```typescript
// Create service for California holidays
const holidayService = new HolidayService({
  country: "US",
  state: "CA",
});

// Get holidays specific to California
const holidays = holidayService.getHolidaysForYear(2024);
```

### Utility Functions

```typescript
import { isHoliday, getHolidayInfo } from "@/lib/services/holidayService";

// Quick check
const isChristmasHoliday = isHoliday(new Date("2024-12-25"), "US");

// Get holiday info
const holiday = getHolidayInfo(new Date("2024-12-25"), "US");
```

## Supported Countries

The `date-holidays` library supports 200+ countries including:

- US (United States)
- CA (Canada)
- GB (United Kingdom)
- AU (Australia)
- DE (Germany)
- FR (France)
- IT (Italy)
- ES (Spain)
- JP (Japan)
- CN (China)
- And many more...

## Integration with Existing System

The holiday functionality integrates seamlessly with the existing availability system:

1. **AvailabilityManager**: Automatically detects holidays when generating month availability
2. **Database**: Uses existing `user_availability_exceptions` table structure
3. **Settings**: Extends existing `AvailabilitySettings` interface
4. **UI**: Integrates with existing calendar components without breaking changes

## Testing

Run the holiday service tests:

```bash
npm test -- --testPathPatterns=holidayService.test.ts
```

## Future Enhancements

- Custom holiday management (add personal holidays)
- Holiday-specific availability rules (e.g., reduced hours on holidays)
- Holiday notifications and reminders
- Integration with external holiday APIs for more comprehensive data
