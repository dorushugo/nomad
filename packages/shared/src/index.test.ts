import { describe, expect, test } from "bun:test";
import {
  documentUploadSchema,
  itemCreateSchema,
  itemTypeSchema,
  reorderItemsSchema,
  timeStringSchema,
  tripCreateSchema,
  tripUpdateSchema,
} from "./index";

describe("timeStringSchema", () => {
  test("accepts HH:mm 24-hour times", () => {
    expect(timeStringSchema.parse("00:00")).toBe("00:00");
    expect(timeStringSchema.parse("08:30")).toBe("08:30");
    expect(timeStringSchema.parse("23:59")).toBe("23:59");
  });

  test("rejects invalid times", () => {
    expect(() => timeStringSchema.parse("24:00")).toThrow();
    expect(() => timeStringSchema.parse("8:30")).toThrow();
    expect(() => timeStringSchema.parse("8h30")).toThrow();
    expect(() => timeStringSchema.parse("")).toThrow();
  });
});

describe("itemTypeSchema", () => {
  test("accepts the 4 known types", () => {
    expect(itemTypeSchema.parse("activity")).toBe("activity");
    expect(itemTypeSchema.parse("accommodation")).toBe("accommodation");
    expect(itemTypeSchema.parse("transport")).toBe("transport");
    expect(itemTypeSchema.parse("note")).toBe("note");
  });

  test("rejects unknown types", () => {
    expect(() => itemTypeSchema.parse("meal")).toThrow();
  });
});

describe("itemCreateSchema", () => {
  test("requires type + title, all else optional", () => {
    expect(itemCreateSchema.parse({ type: "note", title: "Hello" })).toEqual({
      type: "note",
      title: "Hello",
    });
  });

  test("rejects empty title", () => {
    expect(() => itemCreateSchema.parse({ type: "note", title: "" })).toThrow();
  });

  test("accepts optional times when valid", () => {
    expect(
      itemCreateSchema.parse({
        type: "activity",
        title: "Visite",
        startTime: "09:00",
        endTime: "11:30",
      })
    ).toMatchObject({ startTime: "09:00", endTime: "11:30" });
  });

  test("accepts an empty-string time (cleared field)", () => {
    expect(
      itemCreateSchema.parse({ type: "activity", title: "Visite", startTime: "" })
    ).toMatchObject({ startTime: "" });
  });
});

describe("tripCreateSchema", () => {
  test("requires title, destination, startDate, endDate", () => {
    expect(
      tripCreateSchema.parse({
        title: "Lisbon",
        destination: "Lisbonne",
        startDate: "2026-06-01",
        endDate: "2026-06-07",
      })
    ).toMatchObject({ title: "Lisbon", destination: "Lisbonne" });
  });

  test("rejects missing destination", () => {
    expect(() =>
      tripCreateSchema.parse({ title: "x", startDate: "2026-06-01", endDate: "2026-06-07" })
    ).toThrow();
  });
});

describe("tripUpdateSchema", () => {
  test("all fields optional", () => {
    expect(tripUpdateSchema.parse({})).toEqual({});
    expect(tripUpdateSchema.parse({ title: "Renamed" })).toEqual({ title: "Renamed" });
  });
});

describe("documentUploadSchema", () => {
  test("rejects files larger than 10MB", () => {
    expect(() =>
      documentUploadSchema.parse({
        fileName: "big.bin",
        fileType: "application/octet-stream",
        fileSize: 11 * 1024 * 1024,
      })
    ).toThrow(/Fichier trop volumineux/);
  });

  test("rejects non-positive size", () => {
    expect(() =>
      documentUploadSchema.parse({ fileName: "a", fileType: "b", fileSize: 0 })
    ).toThrow();
  });

  test("accepts a 5MB file", () => {
    expect(
      documentUploadSchema.parse({
        fileName: "doc.pdf",
        fileType: "application/pdf",
        fileSize: 5 * 1024 * 1024,
      })
    ).toMatchObject({ fileName: "doc.pdf" });
  });
});

describe("reorderItemsSchema", () => {
  test("accepts an empty list", () => {
    expect(reorderItemsSchema.parse({ items: [] })).toEqual({ items: [] });
  });

  test("requires integer order", () => {
    expect(() => reorderItemsSchema.parse({ items: [{ id: "a", order: 1.5 }] })).toThrow();
  });

  test("accepts a valid batch", () => {
    expect(
      reorderItemsSchema.parse({
        items: [
          { id: "a", order: 0 },
          { id: "b", order: 1 },
        ],
      })
    ).toEqual({
      items: [
        { id: "a", order: 0 },
        { id: "b", order: 1 },
      ],
    });
  });
});
