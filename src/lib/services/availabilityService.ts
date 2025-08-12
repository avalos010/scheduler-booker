import { supabase } from "@/lib/supabase";
import type { TimeSlot } from "../types/availability";

export interface AvailabilityException {
  id?: string;
  user_id: string;
  date: string;
  is_available: boolean;
  reason?: string;
}

export interface UserTimeSlot {
  id?: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked?: boolean;
}

export interface UserWorkingHour {
  id?: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export interface UserAvailabilitySettings {
  id?: string;
  user_id: string;
  slot_duration_minutes: number;
  break_duration_minutes: number;
  advance_booking_days: number;
}

export class AvailabilityService {
  // Settings operations
  static async loadSettings(userId: string) {
    const { data, error } = await supabase
      .from("user_availability_settings")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  }

  static async createDefaultSettings(userId: string) {
    const defaultSettings = {
      user_id: userId,
      slot_duration_minutes: 60,
      break_duration_minutes: 60,
      advance_booking_days: 30,
    };

    const { error } = await supabase
      .from("user_availability_settings")
      .upsert(defaultSettings, { onConflict: "user_id" });

    if (error) throw error;
    return defaultSettings;
  }

  static async saveSettings(settings: UserAvailabilitySettings) {
    const { data, error } = await supabase
      .from("user_availability_settings")
      .upsert(settings)
      .select();

    if (error) throw error;
    return data;
  }

  // Working hours operations
  static async loadWorkingHours(userId: string) {
    const { data, error } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_week");

    if (error) throw error;
    return data;
  }

  static async createDefaultWorkingHours(userId: string) {
    const defaultHours = [
      { day_of_week: 1, start_time: "09:00", end_time: "17:00", is_working: true }, // Monday
      { day_of_week: 2, start_time: "09:00", end_time: "17:00", is_working: true }, // Tuesday
      { day_of_week: 3, start_time: "09:00", end_time: "17:00", is_working: true }, // Wednesday
      { day_of_week: 4, start_time: "09:00", end_time: "17:00", is_working: true }, // Thursday
      { day_of_week: 5, start_time: "09:00", end_time: "17:00", is_working: true }, // Friday
      { day_of_week: 6, start_time: "10:00", end_time: "15:00", is_working: false }, // Saturday
      { day_of_week: 0, start_time: "10:00", end_time: "15:00", is_working: false }, // Sunday
    ];

    const { data, error } = await supabase
      .from("user_working_hours")
      .insert(defaultHours.map((h) => ({ ...h, user_id: userId })))
      .select();

    if (error) throw error;
    return data;
  }

  static async saveWorkingHours(workingHoursData: UserWorkingHour[]) {
    const { error } = await supabase
      .from("user_working_hours")
      .upsert(workingHoursData, { onConflict: "user_id,day_of_week" });

    if (error) throw error;
  }

  // Time slots operations
  static async loadTimeSlotsForDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date, start_time");

    if (error) throw error;
    return data;
  }

  static async loadTimeSlotsForDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("start_time");

    if (error) throw error;
    return data;
  }

  static async saveTimeSlots(slotsData: UserTimeSlot[]) {
    const { error } = await supabase
      .from("user_time_slots")
      .upsert(slotsData, {
        onConflict: "user_id,date,start_time,end_time",
      });

    if (error) throw error;
  }

  static async updateTimeSlot(slotData: UserTimeSlot) {
    const { error } = await supabase
      .from("user_time_slots")
      .upsert(slotData, { onConflict: "user_id,date,start_time,end_time" });

    if (error) throw error;
  }

  static async deleteTimeSlotsForDate(userId: string, date: string) {
    const { error } = await supabase
      .from("user_time_slots")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (error) throw error;
  }

  static async deleteAllTimeSlots(userId: string) {
    const { error } = await supabase
      .from("user_time_slots")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }

  // Availability exceptions operations
  static async loadExceptionsForDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) throw error;
    return data;
  }

  static async loadAllExceptions(userId: string) {
    const { data, error } = await supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  }

  static async loadExceptionForDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned
    return data;
  }

  static async saveException(exception: AvailabilityException) {
    const { error } = await supabase
      .from("user_availability_exceptions")
      .upsert(exception, { onConflict: "user_id,date" });

    if (error) throw error;
  }

  static async deleteAllExceptions(userId: string) {
    const { error } = await supabase
      .from("user_availability_exceptions")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}
