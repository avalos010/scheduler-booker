/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import * as bookingsRoute from "../bookings/route";

// Mock types
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

interface MockSupabaseClient extends SupabaseClient {
  __reset: () => void;
  __tables: () => MockTables;
  __setTimeSlot: (slot: TimeSlotRow) => void;
}

// Enhanced mock for persistence testing
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
    }>
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
        pendingInsert?: Partial<BookingRow & TimeSlotRow>;
        pendingUpdate?: Partial<BookingRow & TimeSlotRow>;
        pendingDelete?: boolean;
        mutationResultRows?: Array<BookingRow | TimeSlotRow>;
      } = { equalsFilters: [] };

      type Builder = {
        select: (selectCols: string) => Builder;
        eq: (
          column: keyof (BookingRow & TimeSlotRow),
          value: unknown
        ) => Builder;
        order: () => Builder;
        single: () => Promise<{
          data: BookingRow | TimeSlotRow | null;
          error: null | { code: string };
        }>;
        update: (updates: Partial<BookingRow & TimeSlotRow>) => Builder;
        insert: (row: Partial<BookingRow & TimeSlotRow>) => Builder;
        delete: () => Builder;
      };

      const builder: Builder = {
        select(selectCols: string) {
          queryState.selectCols = selectCols;
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
              queryState.equalsFilters
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
          if (queryState.pendingUpdate) {
            const rowsToUpdate = filterRows(
              tableName,
              queryState.equalsFilters
            );
            rowsToUpdate.forEach((row) =>
              Object.assign(
                row,
                queryState.pendingUpdate as Partial<BookingRow & TimeSlotRow>
              )
            );
            queryState.mutationResultRows = rowsToUpdate;
          }
          if (queryState.pendingDelete) {
            const rowsToDelete = filterRows(
              tableName,
              queryState.equalsFilters
            );
            if (tableName === "bookings") {
              tables.bookings = (tables.bookings as BookingRow[]).filter(
                (row) => !rowsToDelete.includes(row)
              );
            } else {
              tables.user_time_slots = (
                tables.user_time_slots as TimeSlotRow[]
              ).filter((row) => !rowsToDelete.includes(row));
            }
            queryState.mutationResultRows = rowsToDelete;
          }
          return builder;
        },
        order() {
          return builder;
        },
        async single() {
          const rows =
            queryState.mutationResultRows ??
            filterRows(tableName, queryState.equalsFilters);
          return rows.length
            ? { data: rows[0], error: null }
            : { data: null, error: { code: "PGRST116" } };
        },
        update(updates: Partial<BookingRow & TimeSlotRow>) {
          queryState.pendingUpdate = updates;
          return builder;
        },
        insert(row: Partial<BookingRow & TimeSlotRow>) {
          queryState.pendingInsert = row;
          return builder;
        },
        delete() {
          queryState.pendingDelete = true;
          return builder;
        },
      };
      return builder;
    }) as unknown as SupabaseClient["from"],
    __reset: () => {
      tables = { bookings: [], user_time_slots: [] };
    },
    __tables: () => tables,
    __setTimeSlot: (slot: TimeSlotRow) => {
      tables.user_time_slots.push(slot);
    },
  } as unknown as MockSupabaseClient;

  return {
    createSupabaseServerClient: async () => api,
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

describe("Booking Persistence & Data Integrity", () => {
  const baseUrl = "http://localhost";
  const userId = "user-1";
  const date = "2024-01-01";
  const start = "09:00";
  const end = "10:00";

  let supabase: MockSupabaseClient;

  beforeEach(async () => {
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase-server"
    );
    supabase = (await createSupabaseServerClient()) as MockSupabaseClient;
    supabase.__reset();

    // Seed a free time slot
    supabase.__setTimeSlot({
      id: "slot-1",
      user_id: userId,
      date,
      start_time: `${date}T${start}:00+00:00`,
      end_time: `${date}T${end}:00+00:00`,
      is_available: true,
      is_booked: false,
    });
  });

  it("persists booking data correctly across operations", async () => {
    // Step 1: Create a booking
    const createReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "John Doe",
      clientEmail: "john@example.com",
    });

    const createRes = await bookingsRoute.POST(createReq);
    expect(createRes.status).toBe(200);

    // Verify booking was created in database
    const tables = supabase.__tables();
    expect(tables.bookings).toHaveLength(1);

    const booking = tables.bookings[0];
    expect(booking).toMatchObject({
      user_id: userId,
      date: date,
      start_time: `${date}T${start}:00+00:00`,
      end_time: `${date}T${end}:00+00:00`,
      client_name: "John Doe",
      client_email: "john@example.com",
      status: "pending",
    });

    // Verify time slot was marked as booked
    const timeSlot = tables.user_time_slots[0];
    expect(timeSlot.is_booked).toBe(true);
    expect(timeSlot.is_available).toBe(true); // Slot remains available but is booked
  });

  it("maintains data consistency during status changes", async () => {
    // Create initial booking
    const createReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
    });

    await bookingsRoute.POST(createReq);

    let tables = supabase.__tables();
    const bookingId = tables.bookings[0].id;

    // Confirm the booking
    const confirmReq = makeRequest("PATCH", `${baseUrl}/api/bookings`, {
      bookingId,
      status: "confirmed",
    });

    const confirmRes = await bookingsRoute.PATCH(confirmReq);
    expect(confirmRes.status).toBe(200);

    // Verify status changed in database
    tables = supabase.__tables();
    expect(tables.bookings[0].status).toBe("confirmed");

    // Time slot should still be booked
    expect(tables.user_time_slots[0].is_booked).toBe(true);

    // Cancel the booking
    const cancelReq = makeRequest("PATCH", `${baseUrl}/api/bookings`, {
      bookingId,
      status: "cancelled",
    });

    const cancelRes = await bookingsRoute.PATCH(cancelReq);
    expect(cancelRes.status).toBe(200);

    // Verify cancellation freed the time slot
    tables = supabase.__tables();
    expect(tables.bookings[0].status).toBe("cancelled");
    expect(tables.user_time_slots[0].is_booked).toBe(false);
    expect(tables.user_time_slots[0].is_available).toBe(true);
  });

  it("handles booking deletion with proper cleanup", async () => {
    // Create booking
    const createReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "Delete Test",
      clientEmail: "delete@example.com",
    });

    await bookingsRoute.POST(createReq);

    let tables = supabase.__tables();
    const bookingId = tables.bookings[0].id;

    // Verify initial state
    expect(tables.bookings).toHaveLength(1);
    expect(tables.user_time_slots[0].is_booked).toBe(true);

    // Delete the booking
    const deleteReq = makeRequest(
      "DELETE",
      `${baseUrl}/api/bookings?bookingId=${bookingId}`
    );
    const deleteRes = await bookingsRoute.DELETE(deleteReq);
    expect(deleteRes.status).toBe(200);

    // Verify booking was removed from database
    tables = supabase.__tables();
    expect(tables.bookings).toHaveLength(0);

    // Verify time slot was freed
    expect(tables.user_time_slots[0].is_booked).toBe(false);
    expect(tables.user_time_slots[0].is_available).toBe(true);
  });

  it("prevents booking conflicts and maintains slot integrity", async () => {
    // Create first booking
    const firstBookingReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "First Client",
      clientEmail: "first@example.com",
    });

    const firstRes = await bookingsRoute.POST(firstBookingReq);
    expect(firstRes.status).toBe(200);

    // Verify slot is now booked
    let tables = supabase.__tables();
    expect(tables.user_time_slots[0].is_booked).toBe(true);

    // Try to book the same slot again (should fail due to lack of available slot)
    const conflictBookingReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "Second Client",
      clientEmail: "second@example.com",
    });

    const conflictRes = await bookingsRoute.POST(conflictBookingReq);
    expect(conflictRes.status).toBe(409); // Conflict status code

    // Verify only one booking exists
    tables = supabase.__tables();
    expect(tables.bookings).toHaveLength(1);
    expect(tables.bookings[0].client_name).toBe("First Client");
  });

  it("handles concurrent booking operations correctly", async () => {
    // Add a second available time slot
    supabase.__setTimeSlot({
      id: "slot-2",
      user_id: userId,
      date,
      start_time: `${date}T10:00:00+00:00`,
      end_time: `${date}T11:00:00+00:00`,
      is_available: true,
      is_booked: false,
    });

    // Create two bookings simultaneously
    const booking1Req = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: "09:00",
      endTime: "10:00",
      clientName: "Client A",
      clientEmail: "a@example.com",
    });

    const booking2Req = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: "10:00",
      endTime: "11:00",
      clientName: "Client B",
      clientEmail: "b@example.com",
    });

    const [res1, res2] = await Promise.all([
      bookingsRoute.POST(booking1Req),
      bookingsRoute.POST(booking2Req),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Verify both bookings were created
    const tables = supabase.__tables();
    expect(tables.bookings).toHaveLength(2);

    // Verify both time slots are booked
    const slot1 = tables.user_time_slots.find(
      (s) => s.start_time === `${date}T09:00:00+00:00`
    );
    const slot2 = tables.user_time_slots.find(
      (s) => s.start_time === `${date}T10:00:00+00:00`
    );

    expect(slot1?.is_booked).toBe(true);
    expect(slot2?.is_booked).toBe(true);
  });

  it("preserves booking history through status transitions", async () => {
    // Create booking
    const createReq = makeRequest("POST", `${baseUrl}/api/bookings`, {
      userId,
      date,
      startTime: start,
      endTime: end,
      clientName: "History Test",
      clientEmail: "history@example.com",
    });

    const createRes = await bookingsRoute.POST(createReq);
    expect(createRes.status).toBe(200);

    const tables = supabase.__tables();
    expect(tables.bookings).toHaveLength(1);
    const bookingId = tables.bookings[0].id;
    const originalCreatedAt = tables.bookings[0].created_at;

    // Transition through multiple statuses
    const statuses = ["confirmed", "completed"];

    for (const status of statuses) {
      const updateReq = makeRequest("PATCH", `${baseUrl}/api/bookings`, {
        bookingId,
        status,
      });

      const updateRes = await bookingsRoute.PATCH(updateReq);
      expect(updateRes.status).toBe(200);

      // Verify booking data integrity
      const updatedTables = supabase.__tables();
      const booking = updatedTables.bookings[0];

      expect(booking.id).toBe(bookingId);
      expect(booking.client_name).toBe("History Test");
      expect(booking.client_email).toBe("history@example.com");
      expect(booking.status).toBe(status);
      expect(booking.created_at).toBe(originalCreatedAt); // Should not change
    }
  });
});
