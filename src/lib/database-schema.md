# Database Schema for Availability Management

## Tables

### 1. user_availability_settings

Stores user's default availability preferences and working hours.

```sql
CREATE TABLE user_availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_duration_minutes INTEGER DEFAULT 60,
  break_duration_minutes INTEGER DEFAULT 60,
  advance_booking_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. user_working_hours

Stores default working hours for each day of the week.

```sql
CREATE TABLE user_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_of_week)
);
```

### 3. user_availability_exceptions

Stores specific date exceptions (holidays, vacation days, etc.).

```sql
CREATE TABLE user_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

### 4. user_time_slots

Stores specific time slot availability for specific dates.

```sql
CREATE TABLE user_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, start_time, end_time)
);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE user_availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_time_slots ENABLE ROW LEVEL SECURITY;

-- Users can only access their own availability data
CREATE POLICY "Users can view own availability settings" ON user_availability_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own working hours" ON user_working_hours
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own availability exceptions" ON user_availability_exceptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own time slots" ON user_time_slots
  FOR ALL USING (auth.uid() = user_id);
```

## Functions

### Generate Time Slots

Function to automatically generate time slots based on working hours and slot duration.

```sql
CREATE OR REPLACE FUNCTION generate_time_slots(
  p_user_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS VOID AS $$
DECLARE
  working_hour RECORD;
  current_time TIME;
  slot_start TIME;
  slot_end TIME;
BEGIN
  -- Get working hours for the day of week
  SELECT * INTO working_hour
  FROM user_working_hours
  WHERE user_id = p_user_id
    AND day_of_week = EXTRACT(DOW FROM p_date);

  -- Only generate slots if it's a working day
  IF working_hour.is_working THEN
    current_time := working_hour.start_time;

    WHILE current_time < working_hour.end_time LOOP
      slot_start := current_time;
      slot_end := current_time + (p_slot_duration_minutes || ' minutes')::INTERVAL;

      -- Insert time slot if it fits within working hours
      IF slot_end <= working_hour.end_time THEN
        INSERT INTO user_time_slots (user_id, date, start_time, end_time, is_available)
        VALUES (p_user_id, p_date, slot_start, slot_end, true)
        ON CONFLICT (user_id, date, start_time, end_time) DO NOTHING;
      END IF;

      current_time := slot_end;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_user_availability_settings_user_id ON user_availability_settings(user_id);
CREATE INDEX idx_user_working_hours_user_id ON user_working_hours(user_id);
CREATE INDEX idx_user_availability_exceptions_user_id_date ON user_availability_exceptions(user_id, date);
CREATE INDEX idx_user_time_slots_user_id_date ON user_time_slots(user_id, date);
CREATE INDEX idx_user_time_slots_user_id_date_available ON user_time_slots(user_id, date, is_available);
```

## Usage Examples

### Get user's availability for a specific date

```sql
SELECT
  ts.date,
  ts.start_time,
  ts.end_time,
  ts.is_available,
  ts.is_booked
FROM user_time_slots ts
WHERE ts.user_id = $1
  AND ts.date = $2
  AND ts.is_available = true
ORDER BY ts.start_time;
```

### Get user's working hours for a specific day of week

```sql
SELECT start_time, end_time, is_working
FROM user_working_hours
WHERE user_id = $1 AND day_of_week = $2;
```

### Check if a specific date is available

```sql
SELECT EXISTS(
  SELECT 1 FROM user_availability_exceptions
  WHERE user_id = $1
    AND date = $2
    AND is_available = false
);
```
