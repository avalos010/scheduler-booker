"use client";

import { useState, useEffect } from "react";
import { HolidayService } from "@/lib/services/holidayService";
import type { AvailabilitySettings } from "@/lib/types/availability";

interface HolidaySettingsProps {
  settings: AvailabilitySettings;
  onSettingsChange: (settings: AvailabilitySettings) => void;
}

export default function HolidaySettings({
  settings,
  onSettingsChange,
}: HolidaySettingsProps) {
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [holidayService, setHolidayService] = useState<HolidayService | null>(
    null
  );

  useEffect(() => {
    // Load available countries
    const countries = HolidayService.getAvailableCountries();
    setAvailableCountries(countries);

    // Initialize holiday service with current settings
    if (settings.holidaySettings?.country) {
      const service = new HolidayService({
        country: settings.holidaySettings.country,
        state: settings.holidaySettings.state,
        region: settings.holidaySettings.region,
      });
      setHolidayService(service);
      setAvailableStates(service.getAvailableStates());
    }
  }, [settings.holidaySettings?.country]);

  const handleCountryChange = (country: string) => {
    const service = new HolidayService({ country });
    setHolidayService(service);
    setAvailableStates(service.getAvailableStates());

    onSettingsChange({
      ...settings,
      holidaySettings: {
        country,
        showHolidays: true,
      },
    });
  };

  const handleStateChange = (state: string) => {
    onSettingsChange({
      ...settings,
      holidaySettings: {
        ...settings.holidaySettings!,
        state,
      },
    });
  };

  const handleShowHolidaysToggle = (showHolidays: boolean) => {
    onSettingsChange({
      ...settings,
      holidaySettings: {
        ...settings.holidaySettings!,
        showHolidays,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Holiday Settings
        </h3>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showHolidays"
            checked={settings.holidaySettings?.showHolidays || false}
            onChange={(e) => handleShowHolidaysToggle(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="showHolidays" className="text-sm text-gray-700">
            Show holidays on calendar
          </label>
        </div>
      </div>

      {settings.holidaySettings?.showHolidays && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Country
            </label>
            <select
              id="country"
              value={settings.holidaySettings?.country || "US"}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {availableStates.length > 0 && (
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                State/Region (Optional)
              </label>
              <select
                id="state"
                value={settings.holidaySettings?.state || ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a state/region</option>
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-600 text-lg">ℹ️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  Holidays will be automatically detected and displayed on your
                  calendar based on your selected country and region. This
                  includes public holidays, bank holidays, and other
                  observances.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
