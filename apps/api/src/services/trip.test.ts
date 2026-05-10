import { describe, expect, test } from "bun:test";
import { buildInitialDays } from "./trip";

describe("buildInitialDays", () => {
  test("inclusive range over 5 calendar days", () => {
    const days = buildInitialDays(new Date("2026-06-01T00:00:00"), new Date("2026-06-05T00:00:00"));
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });

  test("single-day trip produces one day", () => {
    const days = buildInitialDays(new Date("2026-06-01T00:00:00"), new Date("2026-06-01T00:00:00"));
    expect(days).toHaveLength(1);
  });

  test("end before start produces no days", () => {
    const days = buildInitialDays(new Date("2026-06-05T00:00:00"), new Date("2026-06-01T00:00:00"));
    expect(days).toHaveLength(0);
  });

  test("crosses month boundary correctly", () => {
    const days = buildInitialDays(new Date("2026-06-29T00:00:00"), new Date("2026-07-02T00:00:00"));
    expect(days.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
    ]);
  });
});
