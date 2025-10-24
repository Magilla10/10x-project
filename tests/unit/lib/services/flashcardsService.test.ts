import { describe, expect, it, vi } from "vitest";

import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  FlashcardsServiceError,
} from "@/lib/services/flashcardsService";

const USER_ID = "user-1";

const createContext = (supabase: Record<string, unknown>) => ({
  supabase: supabase as any,
  userId: USER_ID,
});

describe("flashcardsService", () => {
  describe("createFlashcard", () => {
    it("rzuca błąd limitu gdy Supabase zwraca kod 23514", async () => {
      const single = vi.fn().mockResolvedValue({ data: null, error: { code: "23514" } });
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      const from = vi.fn().mockReturnValue({ insert });

      const supabase = { from };

      await expect(
        createFlashcard(
          {
            front: "Front",
            back: "Back",
          },
          createContext(supabase)
        )
      ).rejects.toMatchObject({ code: "FLASHCARD_LIMIT_REACHED", statusCode: 409 });

      expect(insert).toHaveBeenCalledWith({
        user_id: USER_ID,
        front: "Front",
        back: "Back",
        source: "manual",
        origin_generation_id: null,
      });
    });

    it("mapuje kod 23505 na błąd duplikatu", async () => {
      const single = vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      const from = vi.fn().mockReturnValue({ insert });

      const supabase = { from };

      await expect(
        createFlashcard(
          {
            front: "Front",
            back: "Back",
          },
          createContext(supabase)
        )
      ).rejects.toMatchObject({ code: "FLASHCARD_DUPLICATE", statusCode: 409 });
    });
  });

  describe("updateFlashcard", () => {
    it("odrzuca pustą aktualizację", async () => {
      const from = vi.fn();
      const supabase = { from };

      await expect(updateFlashcard("card-1", {}, createContext(supabase))).rejects.toBeInstanceOf(
        FlashcardsServiceError
      );

      expect(from).not.toHaveBeenCalled();
    });

    it("mapuje kod 23505 na błąd duplikatu", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eqById = vi.fn().mockReturnValue({ select });
      const eqByUser = vi.fn().mockReturnValue({ eq: eqById });
      const update = vi.fn().mockReturnValue({ eq: eqByUser });
      const from = vi.fn().mockReturnValue({ update });

      const supabase = { from };

      await expect(updateFlashcard("card-1", { front: "Nowy front" }, createContext(supabase))).rejects.toMatchObject({
        code: "FLASHCARD_DUPLICATE",
        statusCode: 409,
      });

      expect(update).toHaveBeenCalledWith({ front: "Nowy front" });
    });
  });

  describe("deleteFlashcard", () => {
    it("rzuca błąd gdy rekord nie istnieje", async () => {
      const selectIds = vi.fn().mockResolvedValue({ data: [], error: null });
      const eqById = vi.fn().mockReturnValue({ select: selectIds });
      const eqByUser = vi.fn().mockReturnValue({ eq: eqById });
      const remove = vi.fn().mockReturnValue({ eq: eqByUser });
      const from = vi.fn().mockReturnValue({ delete: remove });

      const supabase = { from };

      await expect(deleteFlashcard("card-1", createContext(supabase))).rejects.toMatchObject({
        code: "FLASHCARD_NOT_FOUND",
        statusCode: 404,
      });

      expect(remove).toHaveBeenCalled();
    });

    it("kończy się sukcesem gdy rekord istnieje", async () => {
      const selectIds = vi.fn().mockResolvedValue({ data: [{ id: "card-1" }], error: null });
      const eqById = vi.fn().mockReturnValue({ select: selectIds });
      const eqByUser = vi.fn().mockReturnValue({ eq: eqById });
      const remove = vi.fn().mockReturnValue({ eq: eqByUser });
      const from = vi.fn().mockReturnValue({ delete: remove });

      const supabase = { from };

      await expect(deleteFlashcard("card-1", createContext(supabase))).resolves.toBeUndefined();

      expect(selectIds).toHaveBeenCalled();
    });
  });
});
