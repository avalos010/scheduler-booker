-- Create tables for availability management

-- User availability settings
CREATE TABLE IF NOT EXISTS user_availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_duration_minutes INTEGER DEFAULT 60,
  advance_booking_days INTEGER DEFAULT 30,
  time_format_12h BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'UTC', -- User's primary timezone
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User working hours (default for each day of week)
CREATE TABLE IF NOT EXISTS user_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL, -- Keep as TIME for now (daily recurring schedule)
  end_time TIME NOT NULL,   -- Keep as TIME for now (daily recurring schedule)
  timezone VARCHAR(50) DEFAULT 'UTC', -- User's timezone for these working hours
  is_working BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_of_week)
);

-- User availability exceptions (specific dates)
CREATE TABLE IF NOT EXISTS user_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User time slots (specific dates and times with timezone support)
CREATE TABLE IF NOT EXISTS user_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Full timestamp for global scheduling
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,   -- Full timestamp for global scheduling
  timezone VARCHAR(50) DEFAULT 'UTC', -- Explicit timezone reference
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, start_time, end_time)
);

-- Bookings table (timezone-aware for global scheduling)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Full timestamp for global scheduling
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,   -- Full timestamp for global scheduling
  timezone VARCHAR(50) DEFAULT 'UTC', -- Explicit timezone reference
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
  access_token UUID DEFAULT gen_random_uuid(), -- Secure token for public access
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  -- user_availability_settings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_settings' AND policyname = 'Users can view own availability settings') THEN
    CREATE POLICY "Users can view own availability settings" ON user_availability_settings
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_settings' AND policyname = 'Users can insert own availability settings') THEN
    CREATE POLICY "Users can insert own availability settings" ON user_availability_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_settings' AND policyname = 'Users can update own availability settings') THEN
    CREATE POLICY "Users can update own availability settings" ON user_availability_settings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user_working_hours policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_working_hours' AND policyname = 'Users can view own working hours') THEN
    CREATE POLICY "Users can view own working hours" ON user_working_hours
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_working_hours' AND policyname = 'Users can insert own working hours') THEN
    CREATE POLICY "Users can insert own working hours" ON user_working_hours
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_working_hours' AND policyname = 'Users can update own working hours') THEN
    CREATE POLICY "Users can update own working hours" ON user_working_hours
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user_availability_exceptions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_exceptions' AND policyname = 'Users can view own availability exceptions') THEN
    CREATE POLICY "Users can view own availability exceptions" ON user_availability_exceptions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_exceptions' AND policyname = 'Users can insert own availability exceptions') THEN
    CREATE POLICY "Users can insert own availability exceptions" ON user_availability_exceptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_exceptions' AND policyname = 'Users can update own availability exceptions') THEN
    CREATE POLICY "Users can update own availability exceptions" ON user_availability_exceptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user_time_slots policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_time_slots' AND policyname = 'Users can view own time slots') THEN
    CREATE POLICY "Users can view own time slots" ON user_time_slots
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_time_slots' AND policyname = 'Users can insert own time slots') THEN
    CREATE POLICY "Users can insert own time slots" ON user_time_slots
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_time_slots' AND policyname = 'Users can update own time slots') THEN
    CREATE POLICY "Users can update own time slots" ON user_time_slots
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- bookings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can view own bookings') THEN
    CREATE POLICY "Users can view own bookings" ON bookings
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can insert own bookings') THEN
    CREATE POLICY "Users can insert own bookings" ON bookings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can update own bookings') THEN
    CREATE POLICY "Users can update own bookings" ON bookings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Add public read access policies for availability
  -- user_availability_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_settings' AND policyname = 'Public can view availability settings') THEN
    CREATE POLICY "Public can view availability settings" ON user_availability_settings
      FOR SELECT USING (true);
  END IF;

  -- user_working_hours
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_working_hours' AND policyname = 'Public can view working hours') THEN
    CREATE POLICY "Public can view working hours" ON user_working_hours
      FOR SELECT USING (true);
  END IF;

  -- user_availability_exceptions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability_exceptions' AND policyname = 'Public can view availability exceptions') THEN
    CREATE POLICY "Public can view availability exceptions" ON user_availability_exceptions
      FOR SELECT USING (true);
  END IF;

  -- user_time_slots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_time_slots' AND policyname = 'Public can view time slots') THEN
    CREATE POLICY "Public can view time slots" ON user_time_slots
      FOR SELECT USING (true);
  END IF;

  -- bookings - allow public access via access_token
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Anyone can view booking with valid access token') THEN
    CREATE POLICY "Anyone can view booking with valid access token" ON bookings
      FOR SELECT USING (true);
  END IF;
  
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_availability_settings_user_id ON user_availability_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_working_hours_user_id ON user_working_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_exceptions_user_id_date ON user_availability_exceptions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_time_slots_user_id_date ON user_time_slots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_time_slots_user_id_date_available ON user_time_slots(user_id, date, is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_date ON bookings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
-- Note: idx_bookings_access_token is created later in the migration after the column is added

-- Function to generate time slots (timezone-aware)
CREATE OR REPLACE FUNCTION generate_time_slots(
  p_user_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS VOID AS $$
DECLARE
  working_hour RECORD;
  user_settings RECORD;
  current_time_val TIME;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  user_timezone VARCHAR(50);
BEGIN
  -- Get user settings to determine timezone
  SELECT timezone INTO user_timezone 
  FROM user_availability_settings 
  WHERE user_id = p_user_id;
  
  -- Default to UTC if no timezone set
  user_timezone := COALESCE(user_timezone, 'UTC');
  
  -- Get working hours for the day of week
  SELECT * INTO working_hour 
  FROM user_working_hours 
  WHERE user_id = p_user_id 
    AND day_of_week = EXTRACT(DOW FROM p_date);
  
  -- Only generate slots if it's a working day
  IF working_hour.is_working THEN
    current_time_val := working_hour.start_time;
    
    WHILE current_time_val < working_hour.end_time LOOP
      -- Convert to full timestamp in user's timezone
      slot_start := (p_date + current_time_val) AT TIME ZONE user_timezone;
      slot_end := slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL;
      
      -- Insert time slot if it fits within working hours
      IF (slot_end AT TIME ZONE user_timezone)::TIME <= working_hour.end_time THEN
        INSERT INTO user_time_slots (user_id, date, start_time, end_time, timezone, is_available)
        VALUES (p_user_id, p_date, slot_start, slot_end, user_timezone, true)
        ON CONFLICT (user_id, date, start_time, end_time) DO NOTHING;
      END IF;
      
      current_time_val := current_time_val + (p_slot_duration_minutes || ' minutes')::INTERVAL;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add time_format_12h and timezone columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add time_format_12h column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_availability_settings'
    AND column_name = 'time_format_12h'
  ) THEN
    ALTER TABLE user_availability_settings
    ADD COLUMN time_format_12h BOOLEAN DEFAULT false;

    -- Update existing records to use 24-hour format by default
    UPDATE user_availability_settings
    SET time_format_12h = false 
    WHERE time_format_12h IS NULL;
  END IF;

  -- Add timezone column to user_availability_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_availability_settings'
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_availability_settings
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
  END IF;

  -- Add timezone column to user_working_hours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_working_hours'
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_working_hours
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
  END IF;

  -- Migrate user_time_slots to use TIMESTAMP WITH TIME ZONE
  -- This is a major schema change - handle carefully
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_time_slots'
    AND column_name = 'start_time'
    AND data_type = 'time without time zone'
  ) THEN
    -- Add new timezone-aware columns
    ALTER TABLE user_time_slots 
    ADD COLUMN start_time_tz TIMESTAMP WITH TIME ZONE,
    ADD COLUMN end_time_tz TIMESTAMP WITH TIME ZONE,
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    
    -- Migrate existing data (assuming UTC timezone for existing records)
    UPDATE user_time_slots 
    SET 
      start_time_tz = (date + start_time) AT TIME ZONE 'UTC',
      end_time_tz = (date + end_time) AT TIME ZONE 'UTC',
      timezone = 'UTC'
    WHERE start_time_tz IS NULL;
    
    -- Drop old columns and rename new ones
    ALTER TABLE user_time_slots DROP COLUMN start_time;
    ALTER TABLE user_time_slots DROP COLUMN end_time;
    ALTER TABLE user_time_slots RENAME COLUMN start_time_tz TO start_time;
    ALTER TABLE user_time_slots RENAME COLUMN end_time_tz TO end_time;
    
    -- Make the new columns NOT NULL
    ALTER TABLE user_time_slots ALTER COLUMN start_time SET NOT NULL;
    ALTER TABLE user_time_slots ALTER COLUMN end_time SET NOT NULL;
  END IF;

  -- Migrate bookings table to use TIMESTAMP WITH TIME ZONE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings'
    AND column_name = 'start_time'
    AND data_type = 'time without time zone'
  ) THEN
    -- Add new timezone-aware columns
    ALTER TABLE bookings 
    ADD COLUMN start_time_tz TIMESTAMP WITH TIME ZONE,
    ADD COLUMN end_time_tz TIMESTAMP WITH TIME ZONE,
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    
    -- Migrate existing data (assuming UTC timezone for existing records)
    UPDATE bookings 
    SET 
      start_time_tz = (date + start_time) AT TIME ZONE 'UTC',
      end_time_tz = (date + end_time) AT TIME ZONE 'UTC',
      timezone = 'UTC'
    WHERE start_time_tz IS NULL;
    
    -- Drop old columns and rename new ones
    ALTER TABLE bookings DROP COLUMN start_time;
    ALTER TABLE bookings DROP COLUMN end_time;
    ALTER TABLE bookings RENAME COLUMN start_time_tz TO start_time;
    ALTER TABLE bookings RENAME COLUMN end_time_tz TO end_time;
    
    -- Make the new columns NOT NULL
    ALTER TABLE bookings ALTER COLUMN start_time SET NOT NULL;
    ALTER TABLE bookings ALTER COLUMN end_time SET NOT NULL;
  END IF;
  
  -- Remove duplicate records first, keeping the most recent one
  DELETE FROM user_availability_settings 
  WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM user_availability_settings 
    ORDER BY user_id, updated_at DESC
  );
  
  -- Add unique constraint on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_availability_settings' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'user_availability_settings_user_id_key'
  ) THEN
    ALTER TABLE user_availability_settings 
    ADD CONSTRAINT user_availability_settings_user_id_key UNIQUE (user_id);
  END IF;

  -- Add access_token column to bookings table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings'
    AND column_name = 'access_token'
  ) THEN
    ALTER TABLE bookings
    ADD COLUMN access_token UUID DEFAULT gen_random_uuid();
    
    -- Update existing bookings to have access tokens
    UPDATE bookings
    SET access_token = gen_random_uuid()
    WHERE access_token IS NULL;
    
    -- Create index on access_token for fast lookups
    CREATE INDEX IF NOT EXISTS idx_bookings_access_token ON bookings(access_token);
  END IF;
END $$;
