import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api/aiGenerationsClient", () => {
  class MockApiError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message);
      this.name = "ApiError";
    }
  }

  return {
    postCreateGeneration: vi.fn(),
    getGenerationDetail: vi.fn(),
    postCommitGeneration: vi.fn(),
    ApiError: MockApiError,
  };
});

import { useAiGeneration } from "@/lib/hooks/useAiGeneration";
import { postCreateGeneration, getGenerationDetail } from "@/lib/api/aiGenerationsClient";

const mockPostCreateGeneration = postCreateGeneration as unknown as ReturnType<
  typeof vi.fn<typeof postCreateGeneration>
>;
const mockGetGenerationDetail = getGenerationDetail as unknown as ReturnType<typeof vi.fn<typeof getGenerationDetail>>;

const SOURCE_TEXT = "a".repeat(1500);

async function seedProposals(result: ReturnType<typeof renderHook<typeof useAiGeneration>>) {
  mockPostCreateGeneration.mockResolvedValueOnce({
    generation: {
      id: "gen-1",
      status: "pending",
      sourceTextLength: SOURCE_TEXT.length,
      maxFlashcards: 5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5000).toISOString(),
    },
  } as unknown);

  mockGetGenerationDetail.mockResolvedValueOnce({
    status: "succeeded",
    errorMessage: null,
    proposedFlashcards: [
      {
        proposalId: "p1",
        front: "Oryginalny front",
        back: "Oryginalny tył",
      },
    ],
  } as unknown);

  await act(async () => {
    await result.current.startGeneration({
      sourceText: SOURCE_TEXT,
      maxFlashcards: 5,
    });
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });
}

describe("useAiGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aktualizuje walidację podczas edycji propozycji", async () => {
    const { result } = renderHook(() => useAiGeneration());
    await seedProposals(result);

    act(() => {
      result.current.editProposal("p1", "zbyt", "Za krótki");
    });

    const proposal = result.current.proposals.find((p) => p.proposalId === "p1");
    expect(proposal?.validation?.front).toMatch(/co najmniej 10/);
    expect(proposal?.validation?.back).toMatch(/co najmniej 10/);
  });

  it("ustawia edited na true gdy draft różni się od oryginału", async () => {
    const { result } = renderHook(() => useAiGeneration());
    await seedProposals(result);

    act(() => {
      result.current.editProposal("p1", "Oryginalny front", "Nowy tył z odpowiednią długością");
    });

    const proposal = result.current.proposals.find((p) => p.proposalId === "p1");
    expect(proposal?.edited).toBe(true);
    expect(proposal?.backDraft).toBe("Nowy tył z odpowiednią długością");
  });

  it("zlicza zaakceptowane propozycje", async () => {
    const { result } = renderHook(() => useAiGeneration());
    await seedProposals(result);

    act(() => {
      result.current.toggleAccept("p1");
    });

    expect(result.current.selection.selectedCount).toBe(1);
    const proposal = result.current.proposals.find((p) => p.proposalId === "p1");
    expect(proposal?.accepted).toBe(true);
  });
});
