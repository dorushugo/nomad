import { describe, expect, test } from "bun:test";
import { sanitizeFileName } from "./document";

describe("sanitizeFileName", () => {
  test("preserves a benign filename", () => {
    expect(sanitizeFileName("photo.jpg")).toBe("photo.jpg");
    expect(sanitizeFileName("itinerary_v2.pdf")).toBe("itinerary_v2.pdf");
    expect(sanitizeFileName("My-Trip.PDF")).toBe("My-Trip.PDF");
  });

  test("strips path traversal segments", () => {
    // path.basename handles POSIX separators; backslashes aren't path
    // separators on POSIX so they're left in the basename and then the
    // regex replaces them with underscores.
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("/var/log/secret.txt")).toBe("secret.txt");
    expect(sanitizeFileName("..\\..\\windows.dll")).toBe(".._.._windows.dll");
  });

  test("replaces unsafe characters with underscores", () => {
    expect(sanitizeFileName("hello world.png")).toBe("hello_world.png");
    expect(sanitizeFileName("rapport (final).pdf")).toBe("rapport__final_.pdf");
    expect(sanitizeFileName("résumé.txt")).toBe("r_sum_.txt");
  });

  test("falls back to 'file' when the result would be empty", () => {
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("///")).toBe("file");
  });
});
