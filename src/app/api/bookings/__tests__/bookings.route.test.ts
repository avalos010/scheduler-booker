/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import * as route from "../route";

// Type definitions
interface BookingRow {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name?: string;
  client_email?: string;
  status?: string;
  created_at?: string;
}

interface TimeSlotRow {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  updated_at?: string;
}

interface MockTables {
  bookings: BookingRow[];
  user_time_slots: TimeSlotRow[];
}

interface Builder {
  select: (selectCols: string) => Builder;
  eq: (column: keyof (BookingRow & TimeSlotRow), value: unknown) => Builder;
  in: (column: keyof (BookingRow & TimeSlotRow), values: unknown[]) => Builder;
  order: () => Builder;
  single: () => Promise<{
    data: BookingRow | TimeSlotRow | null;
    error: null | { code: string };
  }>;
  update: (updates: Partial<BookingRow & TimeSlotRow>) => Builder;
  insert: (row: Partial<BookingRow & TimeSlotRow>) => Builder;
  delete: () => Builder;
  then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>;
}

interface MockSupabaseClient extends SupabaseClient {
  __reset: () => void;
  __tables: () => MockTables;
}

// Mock implementation
jest.mock("@/lib/supabase-server", () => {
  const userId = "user-1";
  let tables: MockTables = {
    bookings: [],
    user_time_slots: [],
  };

  function filterRows(
    tableName: keyof MockTables,
    equalsFilters?: Array<{
      col: keyof (BookingRow & TimeSlotRow);
      val: unknown;
    }>,
    inFilter?: { col: keyof (BookingRow & TimeSlotRow); vals: unknown[] }
  ): Array<BookingRow | TimeSlotRow> {
    let rows = [...tables[tableName]];
    if (equalsFilters) {
      for (const filter of equalsFilters) {
        rows = rows.filter(
          (row) =>
            (row as unknown as Record<string, unknown>)[filter.col] ===
            filter.val
        );
      }
    }
    if (inFilter) {
      rows = rows.filter((row) =>
        (inFilter.vals as unknown[]).includes(
          (row as unknown as Record<string, unknown>)[inFilter.col]
        )
      );
    }
    return rows;
  }

  const api = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: userId } } } }),
      getUser: async () => ({ data: { user: { id: userId } } }),
    } as SupabaseClient["auth"],
    from: ((tableName: keyof MockTables) => {
      const queryState: {
        selectCols?: string;
        equalsFilters: Array<{
          col: keyof (BookingRow & TimeSlotRow);
          val: unknown;
        }>;
        inFilter?: { col: keyof (BookingRow & TimeSlotRow); vals: unknown[] };
        pendingInsert?: Partial<BookingRow & TimeSlotRow>;
        pendingUpdate?: Partial<BookingRow & TimeSlotRow>;
        pendingDelete?: boolean;
        mutationResultRows?: Array<BookingRow | TimeSlotRow>;
      } = { equalsFilters: [] };

      const builder: Builder = {
        select(selectCols: string) {
          queryState.selectCols = selectCols;
          // Apply any pending mutations now, so that subsequent single() works
          if (queryState.pendingInsert) {
            const id = globalThis.crypto?.randomUUID
              ? globalThis.crypto.randomUUID()
              : Math.random().toString(36).slice(2);
            const record = {
              id,
              ...(queryState.pendingInsert as object),
            } as BookingRow | TimeSlotRow;
            if (tableName === "bookings") {
              (tables.bookings as BookingRow[]).push(record as BookingRow);
            } else {
              (tables.user_time_slots as TimeSlotRow[]).push(
                record as TimeSlotRow
              );
            }
            queryState.mutationResultRows = [record];
            queryState.pendingInsert = undefined;
          }
          if (queryState.pendingUpdate) {
            const rowsToUpdate = filterRows(
              tableName,
              queryState.equalsFilters,
              queryState.inFilter
            );
            rowsToUpdate.forEach((row) =>
              Object.assign(row, queryState.pendingUpdate)
            );
            queryState.mutationResultRows = rowsToUpdate;
            queryState.pendingUpdate = undefined;
          }
          return builder;
        },
        eq(column: keyof (BookingRow & TimeSlotRow), value: unknown) {
          queryState.equalsFilters.push({ col: column, val: value });
          return builder;
        },
        in(column: keyof (BookingRow & TimeSlotRow), values: unknown[]) {
          queryState.inFilter = { col: column, vals: values };
          return builder;
        },
        order() {
          return builder;
        },
        async single() {
          if (queryState.pendingUpdate) {
            // Apply conditional update - only update rows that match ALL conditions
            console.log("🔥 Mock: Applying conditional update", {
              tableName,
              equalsFilters: queryState.equalsFilters,
              pendingUpdate: queryState.pendingUpdate,
            });

            // Show all available rows before filtering
            console.log("🔥 Mock: All available rows", tables[tableName]);

            const rowsToUpdate = filterRows(
              tableName,
              queryState.equalsFilters,
              queryState.inFilter
            );

            console.log("🔥 Mock: Rows to update", { rowsToUpdate });

            if (rowsToUpdate.length === 0) {
              // No rows match the conditions, return error
              console.log("🔥 Mock: No rows match conditions");
              return { data: null, error: { code: "PGRST116" } };
            }

            // Apply the update to matching rows
            rowsToUpdate.forEach((row) =>
              Object.assign(row, queryState.pendingUpdate)
            );

            // Clear the pending update
            queryState.pendingUpdate = undefined;

            // Return the first updated row
            console.log("🔥 Mock: Returning updated row", rowsToUpdate[0]);
            return { data: rowsToUpdate[0], error: null };
          }

          const rows =
            queryState.mutationResultRows ??
            filterRows(
              tableName,
              queryState.equalsFilters,
              queryState.inFilter
            );
          return rows.length
            ? { data: rows[0], error: null }
            : { data: null, error: { code: "PGRST116" } };
        },
        update(updates: Partial<BookingRow & TimeSlotRow>) {
          // Defer applying update until select()/single(), so filters after update are included
          queryState.pendingUpdate = updates;
          return builder;
        },
        insert(row: Partial<BookingRow & TimeSlotRow>) {
          // Defer insert until select()/single() to mimic supabase chainability
          queryState.pendingInsert = row;
          return builder;
        },
        then(
          onFulfilled: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          // Handle cases where update() is called but single() is not
          if (queryState.pendingUpdate) {
            const rowsToUpdate = filterRows(
              tableName,
              queryState.equalsFilters,
              queryState.inFilter
            );


            rowsToUpdate.forEach((row) =>
              Object.assign(row, queryState.pendingUpdate)
            );

            // Clear the pending update
            queryState.pendingUpdate = undefined;
          }

          // Return a resolved promise
          return Promise.resolve({ data: null, error: null }).then(
            onFulfilled,
            onRejected
          );
        },
        delete() {
          // Defer delete and allow eq() calls to define filters
          queryState.pendingDelete = true;
          return builder;
        },
      };
      return builder;
    }) as unknown as SupabaseClient["from"],
    // testing helpers
    __reset: () => {
      tables = { bookings: [], user_time_slots: [] };
    },
    __tables: () => tables,
  };

  return {
    createSupabaseServerClient: async () => api as MockSupabaseClient,
  };
});

function makeRequest(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
  return req;
}

describe("/api/bookings route", () => {
  const baseUrl = "http://localhost";
  const userId = "user-1";
  const date = "2024-01-01";
  const start = "09:00";
  const end = "10:00";

  beforeEach(async () => {
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase-server"
    );
    const supabase = (await createSupabaseServerClient()) as MockSupabaseClient;
    supabase.__reset();
    // seed a free time slot
    const tables = supabase.__tables();
    tables.user_time_slots.push({
      id: "slot-1",
      user_id: userId,
      date,
      start_time: `${date}T${start}:00+00:00`,
      end_time: `${date}T${end}:00+00:00`,
      is_available: true,
      is_booked: false,
    });
  });

  it("creates booking and marks slot booked", async () => {
    const req = makeRequest("POST", `${baseUrl}/api/bookings`, {
      timeSlotId: "slot-1",
      date: date,
      startTime: start,
      endTime: end,
      clientName: "A",
      clientEmail: "a@example.com",
    });
    const res = await route.POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    const supabase = (
      await import("@/lib/supabase-server")
    ).createSupabaseServerClient();
    const mockSupabase = (await supabase) as MockSupabaseClient;
    const tables = mockSupabase.__tables();
    expect(tables.bookings.length).toBe(1);
    expect(tables.user_time_slots[0].is_booked).toBe(true);
  });

  it("confirms booking and keeps slot booked", async () => {
    // create booking first
    const createRes = await route.POST(
      makeRequest("POST", `${baseUrl}/api/bookings`, {
        timeSlotId: "slot-1",
        date: date,
        startTime: start,
        endTime: end,
        clientName: "A",
        clientEmail: "a@example.com",
      }) as unknown as NextRequest
    );
    expect(createRes.status).toBe(200);

    const supabase = (
      await import("@/lib/supabase-server")
    ).createSupabaseServerClient();
    const mockSupabase = (await supabase) as MockSupabaseClient;
    const booking = mockSupabase.__tables().bookings[0];

    const res = await route.PATCH(
      makeRequest("PATCH", `${baseUrl}/api/bookings`, {
        bookingId: booking.id,
        status: "confirmed",
      }) as unknown as NextRequest
    );
    expect(res.status).toBe(200);
    expect(mockSupabase.__tables().user_time_slots[0].is_booked).toBe(true);
  });

  it("cancels booking and frees slot", async () => {
    const createRes = await route.POST(
      makeRequest("POST", `${baseUrl}/api/bookings`, {
        timeSlotId: "slot-1",
        date: date,
        startTime: start,
        endTime: end,
        clientName: "A",
        clientEmail: "a@example.com",
      }) as unknown as NextRequest
    );
    expect(createRes.status).toBe(200);

    const supabase = (
      await import("@/lib/supabase-server")
    ).createSupabaseServerClient();
    const mockSupabaseCancel = (await supabase) as MockSupabaseClient;
    const booking = mockSupabaseCancel.__tables().bookings[0];

    const res = await route.PATCH(
      makeRequest("PATCH", `${baseUrl}/api/bookings`, {
        bookingId: booking.id,
        status: "cancelled",
      }) as unknown as NextRequest
    );
    expect(res.status).toBe(200);
    expect(mockSupabaseCancel.__tables().user_time_slots[0].is_booked).toBe(
      false
    );
  });

  it("deletes booking and frees slot", async () => {
    const createRes = await route.POST(
      makeRequest("POST", `${baseUrl}/api/bookings`, {
        timeSlotId: "slot-1",
        date: date,
        startTime: start,
        endTime: end,
        clientName: "A",
        clientEmail: "a@example.com",
      }) as unknown as NextRequest
    );
    expect(createRes.status).toBe(200);

    const supabase = (
      await import("@/lib/supabase-server")
    ).createSupabaseServerClient();
    const mockSupabaseDelete = (await supabase) as MockSupabaseClient;
    const booking = mockSupabaseDelete.__tables().bookings[0];

    const res = await route.DELETE(
      makeRequest(
        "DELETE",
        `${baseUrl}/api/bookings?bookingId=${booking.id}`
      ) as unknown as NextRequest
    );
    expect(res.status).toBe(200);
    expect(mockSupabaseDelete.__tables().user_time_slots[0].is_booked).toBe(
      false
    );
  });

  it("creates booking with slot-startTime-endTime format using provided date", async () => {
    const testDate = "2025-02-15";
    const testStartTime = "10:00";
    const testEndTime = "11:00";

    const req = makeRequest("POST", `${baseUrl}/api/bookings`, {
      timeSlotId: `slot-${testStartTime}-${testEndTime}`,
      date: testDate,
      startTime: testStartTime,
      endTime: testEndTime,
      clientName: "Test Client",
      clientEmail: "test@example.com",
    });

    const res = await route.POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    const supabase = (
      await import("@/lib/supabase-server")
    ).createSupabaseServerClient();
    const mockSupabase = (await supabase) as MockSupabaseClient;
    const tables = mockSupabase.__tables();

    // Verify booking was created with the correct date
    expect(tables.bookings.length).toBe(1);
    expect(tables.bookings[0].date).toBe(testDate);
    expect(tables.bookings[0].start_time).toBe(
      `${testDate}T${testStartTime}:00+00:00`
    );
    expect(tables.bookings[0].end_time).toBe(
      `${testDate}T${testEndTime}:00+00:00`
    );
  });
});
