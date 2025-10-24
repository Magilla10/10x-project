import { describe, expect, it } from "vitest";

import {
  countCodePoints,
  validateSourceText,
  validateFlashcardFront,
  validateFlashcardBack,
  validateTemperature,
  validateMaxFlashcards,
  mightExceedPayloadSize,
} from "@/lib/utils/validation";

describe("validation utils", () => {
  describe("countCodePoints", () => {
    it("liczy znaki Unicode niezależnie od surrogate pairs", () => {
      expect(countCodePoints("👍👍")).toBe(2);
      expect(countCodePoints("ąść")).toBe(3);
    });
  });

  describe("validateSourceText", () => {
    it("odrzuca tekst krótszy niż 1000 znaków", () => {
      const result = validateSourceText("a".repeat(999));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/co najmniej 1000/);
    });

    it("odrzuca tekst dłuższy niż 10000 znaków", () => {
      const result = validateSourceText("a".repeat(10001));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/10000 znaków/);
    });

    it("akceptuje tekst w dozwolonym zakresie", () => {
      expect(validateSourceText("a".repeat(1500))).toEqual({ isValid: true });
    });
  });

  describe("validateFlashcardFront", () => {
    it("odrzuca zbyt krótki tekst", () => {
      const result = validateFlashcardFront("krótki");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/co najmniej 10/);
    });

    it("odrzuca zbyt długi tekst", () => {
      const result = validateFlashcardFront("x".repeat(201));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/200 znaków/);
    });

    it("akceptuje poprawny tekst", () => {
      expect(validateFlashcardFront("Poprawny przód".padEnd(12, "."))).toEqual({ isValid: true });
    });
  });

  describe("validateFlashcardBack", () => {
    it("odrzuca zbyt krótki tekst", () => {
      const result = validateFlashcardBack("za krótki");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/co najmniej 10/);
    });

    it("odrzuca zbyt długi tekst", () => {
      const result = validateFlashcardBack("x".repeat(501));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/500 znaków/);
    });

    it("akceptuje poprawny tekst", () => {
      expect(validateFlashcardBack("To jest poprawny opis tyłu.".padEnd(20, "."))).toEqual({ isValid: true });
    });
  });

  describe("validateTemperature", () => {
    it("akceptuje wartość opcjonalną", () => {
      expect(validateTemperature(undefined)).toEqual({ isValid: true });
    });

    it("odrzuca wartości spoza zakresu", () => {
      expect(validateTemperature(-0.1).isValid).toBe(false);
      expect(validateTemperature(2.1).isValid).toBe(false);
    });

    it("odrzuca wartości z ponad dwoma miejscami po przecinku", () => {
      const result = validateTemperature(1.234);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/2 miejsca/);
    });

    it("akceptuje poprawną temperaturę", () => {
      expect(validateTemperature(1.25)).toEqual({ isValid: true });
    });
  });

  describe("validateMaxFlashcards", () => {
    it("odrzuca wartości poza zakresem 1-15", () => {
      expect(validateMaxFlashcards(0).isValid).toBe(false);
      expect(validateMaxFlashcards(16).isValid).toBe(false);
    });

    it("akceptuje wartości w zakresie", () => {
      expect(validateMaxFlashcards(10)).toEqual({ isValid: true });
    });
  });

  describe("mightExceedPayloadSize", () => {
    it("zwraca true gdy rozmiar przekracza próg", () => {
      expect(mightExceedPayloadSize("a".repeat(9000))).toBe(true);
    });

    it("zwraca false dla mniejszego ładunku", () => {
      expect(mightExceedPayloadSize("a".repeat(1000))).toBe(false);
    });
  });
});
