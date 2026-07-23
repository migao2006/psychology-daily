"use client";

import { useEffect, useMemo, useState } from "react";
import { getDatabase } from "@/lib/db/database";
import {
  getResearchPreferences,
  resetResearchPreferences,
  saveResearchPreferences,
} from "@/lib/db/research-preferences";
import {
  defaultResearchPreferences,
  hasPersonalizedPreferences,
  type ResearchPreferences,
} from "@/lib/research/preferences";
import { rankResearchForUser } from "@/lib/research/recommend";
import { matchesResearchSearch, normalizeResearchText } from "@/lib/research/search";
import type { ReadResearch } from "@/lib/schemas/progress";
import type { DailyResearch } from "@/lib/schemas/research";
import { ResearchCard } from "./research-card";
import { ResearchPreferencesPanel } from "./research-preferences";

const filters = [
  "全部",
  "已同儕審查",
  "預印本",
  "系統性回顧",
  "統合分析",
  "實驗研究",
  "縱貫研究",
  "認知心理學",
  "社會心理學",
  "發展心理學",
  "心理健康",
  "神經科學",
  "人格與個別差異",
];

type SortMode = "recommended" | "newest";

export function ResearchList({ research }: { research: DailyResearch[] }) {
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [preferences, setPreferences] = useState(defaultResearchPreferences);
  const [readHistory, setReadHistory] = useState<ReadResearch[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      getResearchPreferences(),
      getDatabase().readResearch.toArray(),
    ])
      .then(([storedPreferences, storedHistory]) => {
        if (!active) return;
        setPreferences(storedPreferences);
        setReadHistory(storedHistory);
      })
      .catch(() => {
        if (!active) return;
        setStorageMessage("無法載入本機偏好，目前先依最新研究排序。");
        setSortMode("newest");
      });
    return () => {
      active = false;
    };
  }, []);

  const ranked = useMemo(
    () => rankResearchForUser(research, preferences, readHistory),
    [preferences, readHistory, research],
  );

  const shown = useMemo(() => {
    const filtered = ranked.filter(
      ({ research: item }) =>
        matchesResearchSearch(item, query) &&
        (filter === "全部" || matchFilter(item, filter)),
    );
    if (sortMode === "recommended") return filtered;
    return filtered.toSorted(
      (left, right) =>
        right.research.featuredDate.localeCompare(left.research.featuredDate) ||
        left.research.id.localeCompare(right.research.id),
    );
  }, [filter, query, ranked, sortMode]);

  const activePreferenceCount =
    preferences.categories.length +
    preferences.studyTypes.length +
    Number(preferences.preferOpenAccess);

  async function handleSave(
    input: Omit<ResearchPreferences, "version" | "updatedAt">,
  ) {
    const saved = await saveResearchPreferences(input);
    setPreferences(saved);
    setShowPreferences(false);
    setSortMode("recommended");
  }

  async function handleReset() {
    const defaults = await resetResearchPreferences();
    setPreferences(defaults);
    setShowPreferences(false);
  }

  function clearSearchAndFilters() {
    setQuery("");
    setFilter("全部");
  }

  return (
    <div className="research-explorer">
      <section className="card research-toolbar" aria-label="搜尋與排序研究">
        <form
          className="research-search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="research-search">搜尋本站研究庫</label>
          <div className="search-input-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              id="research-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入主題、作者、關鍵詞或英文標題"
              autoComplete="off"
            />
          </div>
          <p className="field-hint">搜尋已通過內容驗證的本站研究，不會即時查詢外部網站。</p>
        </form>
        <div className="research-toolbar-actions">
          <label className="form-field" htmlFor="research-sort">
            <span>排序方式</span>
            <select
              id="research-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="recommended">為你推薦</option>
              <option value="newest">最新收錄</option>
            </select>
          </label>
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={showPreferences}
            aria-controls="research-preferences"
            aria-label={
              showPreferences ? "收起研究偏好" : "設定研究偏好"
            }
            onClick={() => setShowPreferences((current) => !current)}
          >
            {showPreferences ? "收起偏好" : "設定研究偏好"}
            {activePreferenceCount > 0 ? (
              <span className="count-badge" aria-hidden="true">
                {activePreferenceCount}
              </span>
            ) : null}
          </button>
        </div>
      </section>

      {showPreferences ? (
        <div id="research-preferences">
          <ResearchPreferencesPanel
            key={preferences.updatedAt}
            initialPreferences={preferences}
            onSave={handleSave}
            onReset={handleReset}
            onCancel={() => setShowPreferences(false)}
          />
        </div>
      ) : null}

      <div className="research-filter-area">
        <div className="filter-row" role="group" aria-label="研究篩選">
          {filters.map((item) => (
            <button
              key={item}
              className="filter-button"
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="filter-hint muted">向左右滑動可查看更多篩選</p>
      </div>

      <div className="research-results-heading">
        <div>
          <h2 id="research-results-title">
            {sortMode === "recommended" ? "為你推薦" : "研究列表"}
          </h2>
          <p className="muted" role="status" aria-live="polite">
            找到 {shown.length} 篇研究
            {query.trim() ? `，搜尋「${query.trim()}」` : ""}
          </p>
        </div>
        {hasPersonalizedPreferences(preferences) || readHistory.length > 0 ? (
          <p className="recommendation-note">
            推薦依你的偏好與已標記閱讀內容計算，可隨時修改。
          </p>
        ) : (
          <p className="recommendation-note">
            先選擇主題或閱讀幾篇，推薦會逐漸貼近你的興趣。
          </p>
        )}
      </div>
      {storageMessage ? <p className="notice">{storageMessage}</p> : null}
      {research.length < 3 ? (
        <p className="notice">
          研究庫目前仍在累積；內容增加後，個人化排序會更有差異。
        </p>
      ) : null}

      <section
        className="research-grid"
        aria-labelledby="research-results-title"
      >
        {shown.length === 0 ? (
          <div className="card research-empty">
            <h2>目前沒有符合的研究</h2>
            <p className="muted">
              找不到符合「{query.trim() || filter}」的內容。你可以清除搜尋與篩選後再試一次。
            </p>
            <button
              className="button button-secondary"
              type="button"
              onClick={clearSearchAndFilters}
            >
              清除搜尋與篩選
            </button>
          </div>
        ) : (
          shown.map((item) => (
            <ResearchCard
              key={item.research.id}
              ranked={item}
              showReasons={sortMode === "recommended"}
            />
          ))
        )}
      </section>
    </div>
  );
}

function matchFilter(item: DailyResearch, filter: string) {
  if (filter === "已同儕審查") return item.publicationStatus === "peer_reviewed";
  if (filter === "預印本") return item.publicationStatus === "preprint";
  const types: Record<string, DailyResearch["studyType"][]> = {
    系統性回顧: ["systematic_review"],
    統合分析: ["meta_analysis"],
    實驗研究: ["experimental", "randomized_trial"],
    縱貫研究: ["longitudinal"],
  };
  if (types[filter]) return types[filter].includes(item.studyType);
  const category = normalizeResearchText(item.psychologyCategory);
  const target = normalizeResearchText(filter);
  return category.includes(target) || target.includes(category);
}
