import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, isAvailable, reason } = body;

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // Save the exception
    const { error: saveError } = await supabase
      .from("user_availability_exceptions")
      .upsert(
        {
          user_id: user.id,
          date,
          is_available: isAvailable,
          reason: reason || null,
        },
        { onConflict: "user_id,date" }
      );

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", user.id);

    if (date) {
      query = query.eq("date", date);
    } else if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query.order("date");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
      user: user.id,
      query: { date, startDate, endDate },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
