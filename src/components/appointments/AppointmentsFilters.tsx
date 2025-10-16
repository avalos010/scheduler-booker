import { useState } from "react";
import type { Booking } from "@/lib/types/availability";

interface AppointmentsFiltersProps {
  query: string;
  setQuery: (query: string) => void;
  statusFilter: Booking["status"] | "all";
  setStatusFilter: (filter: Booking["status"] | "all") => void;
  upcomingOnly: boolean;
  setUpcomingOnly: (upcoming: boolean) => void;
}

export default function AppointmentsFilters({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  upcomingOnly,
  setUpcomingOnly,
}: AppointmentsFiltersProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search clients"
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white text-gray-900 placeholder-gray-500"
      />

      {/* Fancy status dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsStatusOpen((v) => !v)}
          className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 border-gray-300 text-left flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-haspopup="listbox"
          aria-expanded={isStatusOpen}
          title="Filter by status"
        >
          <span className="truncate">
            {statusFilter === "all"
              ? "All statuses"
              : statusFilter === "pending"
              ? "Pending"
              : statusFilter === "confirmed"
              ? "Confirmed"
              : statusFilter === "cancelled"
              ? "Cancelled"
              : statusFilter === "completed"
              ? "Completed"
              : "No Show"}
          </span>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isStatusOpen ? "rotate-180" : "rotate-0"
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isStatusOpen && (
          <ul
            className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            role="listbox"
          >
            {(
              [
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" },
                { value: "no-show", label: "No Show" },
              ] as Array<{
                value: Booking["status"] | "all";
                label: string;
              }>
            ).map((opt) => (
              <li
                key={opt.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-900 ${
                  statusFilter === opt.value ? "bg-gray-50" : ""
                }`}
                role="option"
                aria-selected={statusFilter === opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setIsStatusOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer select-none bg-white text-gray-900">
        <input
          type="checkbox"
          checked={upcomingOnly}
          onChange={(e) => setUpcomingOnly(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">Upcoming only</span>
      </label>
    </div>
  );
}
