-- Create tables for availability management

-- User availability settings
CREATE TABLE IF NOT EXISTS user_availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_duration_minutes INTEGER DEFAULT 60,
  break_duration_minutes INTEGER DEFAULT 60,
  advance_booking_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User working hours (default for each day of week)
CREATE TABLE IF NOT EXISTS user_working_hours (
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

-- User time slots (specific dates)
CREATE TABLE IF NOT EXISTS user_time_slots (
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

-- Bookings table
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
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

-- Function to generate time slots
CREATE OR REPLACE FUNCTION generate_time_slots(
  p_user_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS VOID AS $$
DECLARE
  working_hour RECORD;
  current_time_val TIME;
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
    current_time_val := working_hour.start_time;
    
    WHILE current_time_val < working_hour.end_time LOOP
      slot_start := current_time_val;
      slot_end := current_time_val + (p_slot_duration_minutes || ' minutes')::INTERVAL;
      
      -- Insert time slot if it fits within working hours
      IF slot_end <= working_hour.end_time THEN
        INSERT INTO user_time_slots (user_id, date, start_time, end_time, is_available)
        VALUES (p_user_id, p_date, slot_start, slot_end, true)
        ON CONFLICT (user_id, date, start_time, end_time) DO NOTHING;
      END IF;
      
      current_time_val := slot_end;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;
