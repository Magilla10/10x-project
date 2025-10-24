import { describe, expect, it, vi, afterEach } from "vitest";
import { webcrypto } from "node:crypto";

import { createGeneration, AiGenerationError } from "@/lib/services/aiGenerationsService";

type SupabaseLike = {
  from: ReturnType<typeof vi.fn>;
};

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("aiGenerationsService.createGeneration", () => {
  const mockDigest = () =>
    vi.spyOn(globalThis.crypto.subtle, "digest").mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

  it("odrzuca gdy istnieje oczekująca generacja", async () => {
    mockDigest();

    const pendingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "pending-id" }, error: null }),
    };

    const supabase: SupabaseLike = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "ai_generation_logs") {
          return pendingQuery as any;
        }
        if (table === "flashcards") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any;
        }
        throw new Error("unexpected table");
      }),
    };

    await expect(
      createGeneration(
        {
          sourceText: "a".repeat(1500),
          maxFlashcards: 5,
        },
        { supabase: supabase as unknown as any, userId: "user-1" }
      )
    ).rejects.toMatchObject({ code: "GENERATION_PENDING", statusCode: 409 });

    expect(supabase.from).toHaveBeenCalledWith("ai_generation_logs");
    expect(pendingQuery.select).toHaveBeenCalledWith("id");
  });

  it("ustawia status failed gdy enqueue funkcji kończy się błędem", async () => {
    mockDigest();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "edge failure",
    });
    vi.stubGlobal("fetch", fetchMock);

    const pendingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const flashcardsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      }),
    };

    const insertedRow = {
      id: "gen-1",
      status: "pending",
      source_text_length: 1500,
      created_at: new Date().toISOString(),
    };

    const insertSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
    const insertQuery = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: insertSingle }),
      }),
    };

    const updateSingle = vi.fn().mockResolvedValue({ data: { id: "gen-1" }, error: null });
    const updateQuery = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: updateSingle }),
          }),
        }),
      }),
    };

    const logInsert = vi.fn().mockResolvedValue({ error: null });

    let callIndex = 0;

    const supabase: SupabaseLike = {
      from: vi.fn((table: string) => {
        if (table === "ai_generation_logs") {
          const index = callIndex++;
          if (index === 0) return pendingQuery as any;
          if (index === 1) return insertQuery as any;
          if (index === 2) return updateQuery as any;
        }

        if (table === "flashcards") {
          return flashcardsQuery as any;
        }

        if (table === "ai_generation_error_logs") {
          return { insert: logInsert } as any;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      createGeneration(
        {
          sourceText: "a".repeat(1500),
          maxFlashcards: 10,
        },
        { supabase: supabase as unknown as any, userId: "user-1" }
      )
    ).rejects.toMatchObject({ code: "QUEUE_ENQUEUE_FAILED", statusCode: 500 });

    expect(fetchMock).toHaveBeenCalled();
    expect(updateQuery.update).toHaveBeenCalledWith({ status: "failed", error_message: expect.any(String) });
    expect(logInsert).toHaveBeenCalled();
  });
});
