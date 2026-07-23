// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ResearchList } from "@/components/research/research-list";
import { clearProgress } from "@/lib/db/backup";
import { closeDatabase, getDatabase } from "@/lib/db/database";
import { getResearchPreferences } from "@/lib/db/research-preferences";
import { researchCatalogFixtures } from "@/tests/fixtures/research";

describe("ResearchList", () => {
  afterEach(async () => {
    cleanup();
    await clearProgress().catch(() => undefined);
    await closeDatabase();
  });

  it("filters without losing the verified card metadata", async () => {
    render(<ResearchList research={researchCatalogFixtures} />);
    expect(screen.getByText("工作記憶與學習策略")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "進階篩選" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "預印本" }));
    expect(screen.queryByText("工作記憶與學習策略")).not.toBeInTheDocument();
    expect(screen.getByText("目前沒有符合的研究")).toBeInTheDocument();
  });

  it("searches the local library and clears an empty result", async () => {
    render(<ResearchList research={researchCatalogFixtures} />);
    await userEvent.click(screen.getByRole("button", { name: "全部研究" }));
    const search = screen.getByRole("combobox", {
      name: "搜尋研究庫",
    });
    await userEvent.type(search, "Sleep brain");
    expect(screen.getByText("睡眠與腦功能的系統性回顧")).toBeInTheDocument();
    expect(screen.queryByText("工作記憶與學習策略")).not.toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, "不存在");
    await userEvent.click(
      screen.getByRole("button", { name: "查看全部研究" }),
    );
    expect(screen.getByText("工作記憶與學習策略")).toBeInTheDocument();
  });

  it("saves editable preferences in IndexedDB and reranks immediately", async () => {
    render(<ResearchList research={researchCatalogFixtures} />);
    await userEvent.click(
      screen.getByRole("button", { name: "研究偏好" }),
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "神經科學" }),
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "系統性回顧" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "儲存偏好" }));

    await waitFor(async () => {
      expect((await getResearchPreferences()).categories).toContain("神經科學");
    });
    const cards = screen.getAllByRole("article");
    expect(cards[0]).toHaveAttribute("data-research-id", "fixture-neuroscience");
    expect(screen.getByText("符合你偏好的神經科學")).toBeInTheDocument();

    await getDatabase().readResearch.put({
      researchId: "fixture-neuroscience",
      readAt: "2026-07-23T10:00:00Z",
    });
  });

  it("renders a compact first page and loads the catalog progressively", async () => {
    const catalog = Array.from({ length: 25 }, (_, index) => ({
      ...researchCatalogFixtures[index % researchCatalogFixtures.length],
      id: `catalog-${index}`,
      titleZh: `目錄研究 ${index + 1}`,
      searchText: `目錄研究 ${index + 1}`,
    }));

    render(<ResearchList research={catalog} />);
    await userEvent.click(screen.getByRole("button", { name: "全部研究" }));

    expect(screen.getAllByRole("article")).toHaveLength(12);
    await userEvent.click(
      screen.getByRole("button", { name: /載入更多研究/ }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(24);
  });
});
