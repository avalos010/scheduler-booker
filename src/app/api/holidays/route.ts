import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load holidays/exceptions for the date range
    const { data: holidays, error: holidaysError } = await supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_available", false) // Only get holidays (non-available days)
      .order("date");

    if (holidaysError) {
      return NextResponse.json(
        { error: holidaysError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      holidays: holidays || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, reason, isRecurring, recurringYears } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const holidays = [];

    if (isRecurring && recurringYears) {
      // Create recurring holidays for multiple years
      const baseDate = new Date(date);
      const currentYear = baseDate.getFullYear();

      for (
        let year = currentYear;
        year <= currentYear + recurringYears;
        year++
      ) {
        const holidayDate = new Date(baseDate);
        holidayDate.setFullYear(year);

        const { data: holiday, error: holidayError } = await supabase
          .from("user_availability_exceptions")
          .insert({
            user_id: user.id,
            date: holidayDate.toISOString().split("T")[0],
            is_available: false,
            reason: reason || "Holiday",
          })
          .select()
          .single();

        if (holidayError) {
          console.error("Error creating recurring holiday:", holidayError);
        } else {
          holidays.push(holiday);
        }
      }
    } else {
      // Create single holiday
      const { data: holiday, error: holidayError } = await supabase
        .from("user_availability_exceptions")
        .insert({
          user_id: user.id,
          date: date,
          is_available: false,
          reason: reason || "Holiday",
        })
        .select()
        .single();

      if (holidayError) {
        return NextResponse.json(
          { error: holidayError.message },
          { status: 500 }
        );
      }

      holidays.push(holiday);
    }

    return NextResponse.json({
      holidays,
      message: isRecurring
        ? `Created ${holidays.length} recurring holidays`
        : "Holiday created successfully",
    });
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const holidayId = searchParams.get("id");

    if (!holidayId) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from("user_availability_exceptions")
      .delete()
      .eq("id", holidayId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
