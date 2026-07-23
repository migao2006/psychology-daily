// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ResearchList } from "@/components/research/research-list";
import seed from "@/content/research/daily/2026-07-23.json";
import { dailyResearchSchema } from "@/lib/schemas/research";
describe("ResearchList", () => {
  it("filters without losing the verified card metadata", async () => {
    render(<ResearchList research={[dailyResearchSchema.parse(seed)]} />);
    expect(screen.getByText(seed.titleZh)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "預印本" }));
    expect(screen.queryByText(seed.titleZh)).not.toBeInTheDocument();
    expect(screen.getByText("目前沒有符合的研究")).toBeInTheDocument();
  });
});
