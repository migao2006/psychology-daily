import { describe, expect, it } from "vitest";
import {
  defaultResearchPreferences,
  type ResearchPreferences,
} from "@/lib/research/preferences";
import { rankResearchForUser } from "@/lib/research/recommend";
import {
  matchesResearchSearch,
  normalizeResearchText,
  searchResearch,
} from "@/lib/research/search";
import { researchCatalogFixtures } from "@/tests/fixtures/research";

const NOW = new Date("2026-07-23T12:00:00Z");

describe("research personalization", () => {
  it("prioritizes explicit preferences and explains the match", () => {
    const preferences: ResearchPreferences = {
      ...defaultResearchPreferences(NOW),
      categories: ["神經科學"],
      studyTypes: ["systematic_review"],
    };
    const ranked = rankResearchForUser(researchCatalogFixtures, preferences, [], {
      now: NOW,
    });
    expect(ranked[0].research.id).toBe("fixture-neuroscience");
    expect(ranked[0].reasons).toContain("符合你偏好的神經科學");
  });

  it("learns from reading while down-ranking the item already read", () => {
    const ranked = rankResearchForUser(
      researchCatalogFixtures,
      defaultResearchPreferences(NOW),
      [
        {
          researchId: "fixture-social",
          readAt: "2026-07-23T10:00:00Z",
        },
      ],
      { now: NOW },
    );
    expect(ranked[0].research.id).toBe("fixture-social-followup");
    expect(ranked.find((item) => item.research.id === "fixture-social")?.isRead).toBe(
      true,
    );
  });

  it("is deterministic regardless of input order", () => {
    const preferences = defaultResearchPreferences(NOW);
    const forward = rankResearchForUser(researchCatalogFixtures, preferences, [], {
      now: NOW,
    }).map((item) => item.research.id);
    const reverse = rankResearchForUser(
      [...researchCatalogFixtures].reverse(),
      preferences,
      [],
      { now: NOW },
    ).map((item) => item.research.id);
    expect(reverse).toEqual(forward);
  });

  it("uses active feedback without permanently blocking a category", () => {
    const ranked = rankResearchForUser(
      researchCatalogFixtures,
      defaultResearchPreferences(NOW),
      [],
      { now: NOW },
      [
        {
          researchId: "fixture-social",
          favorite: false,
          readLater: false,
          feedback: "less",
          updatedAt: NOW.toISOString(),
        },
      ],
    );
    expect(ranked).toHaveLength(researchCatalogFixtures.length);
    expect(ranked.find((item) => item.research.id === "fixture-social")).toBeDefined();
  });

  it("searches Chinese, English, authors and keywords after NFKC normalization", () => {
    expect(normalizeResearchText(" ＷＯＲＫＩＮＧ   Memory ")).toBe(
      "working memory",
    );
    expect(searchResearch(researchCatalogFixtures, "BRAIN systematic")).toHaveLength(1);
    expect(searchResearch(researchCatalogFixtures, "社會規範")).toHaveLength(2);
    expect(matchesResearchSearch(researchCatalogFixtures[0], "test author")).toBe(true);
    expect(searchResearch(researchCatalogFixtures, "不存在的主題")).toHaveLength(0);
  });
});
