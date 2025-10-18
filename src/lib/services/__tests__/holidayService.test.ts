import { HolidayService } from "../holidayService";

describe("HolidayService", () => {
  let holidayService: HolidayService;

  beforeEach(() => {
    holidayService = new HolidayService({ country: "US" });
  });

  test("should detect US holidays", () => {
    // Test New Year's Day 2024
    const newYear = new Date("2024-01-01");
    const holiday = holidayService.getHolidayInfo(newYear);

    expect(holiday).toBeTruthy();
    expect(holiday?.name).toContain("New Year");
    expect(holiday?.country).toBe("US");
  });

  test("should return null for non-holiday dates", () => {
    // Test a random weekday
    const regularDay = new Date("2024-03-15");
    const holiday = holidayService.getHolidayInfo(regularDay);

    expect(holiday).toBeNull();
  });

  test("should get holidays for a year", () => {
    const holidays = holidayService.getHolidaysForYear(2024);

    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays.some((h) => h.name.includes("Christmas"))).toBe(true);
  });

  test("should get available countries", () => {
    const countries = HolidayService.getAvailableCountries();

    expect(countries).toContain("US");
    expect(countries).toContain("CA");
    expect(countries.length).toBeGreaterThan(10);
  });
});
