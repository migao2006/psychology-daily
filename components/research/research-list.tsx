"use client";

import { useEffect, useMemo, useState } from "react";
import { getDatabase } from "@/lib/db/database";
import {
  clearResearchInteractions,
  saveResearchFilter,
  saveResearchInteraction,
} from "@/lib/db/research-interactions";
import {
  getResearchPreferences,
  resetResearchPreferences,
  saveResearchPreferences,
} from "@/lib/db/research-preferences";
import {
  defaultResearchPreferences,
  hasPersonalizedPreferences,
  RESEARCH_CATEGORIES,
  STUDY_TYPE_OPTIONS,
  type ResearchPreferences,
} from "@/lib/research/preferences";
import { rankResearchForUser } from "@/lib/research/recommend";
import {
  matchesResearchFilters,
  researchSearchSuggestions,
  type ResearchSearchFilters,
} from "@/lib/research/search";
import type {
  ReadResearch,
  ResearchInteraction,
  SavedResearchFilter,
} from "@/lib/schemas/progress";
import type { ResearchCatalogItem } from "@/lib/schemas/research";
import { ResearchCard } from "./research-card";
import { ResearchPreferencesPanel } from "./research-preferences";

type SortMode = "recommended" | "newest" | "unread";
type Shelf = "today" | "recommended" | "newest" | "unread" | "favorites" | "explore" | "all";

const shelves: Array<{ id: Shelf; label: string }> = [
  { id: "today", label: "今日精選" },
  { id: "recommended", label: "為你推薦" },
  { id: "newest", label: "最新研究" },
  { id: "unread", label: "尚未閱讀" },
  { id: "favorites", label: "已收藏" },
  { id: "explore", label: "探索不同主題" },
  { id: "all", label: "全部研究" },
];

const emptyFilters: ResearchSearchFilters = {
  query: "",
  categories: [],
  studyTypes: [],
  publicationStatuses: [],
  openAccessOnly: false,
  dateFrom: null,
  dateTo: null,
};
const PAGE_SIZE = 12;

export function ResearchList({
  research,
  featuredResearchId,
}: {
  research: ResearchCatalogItem[];
  featuredResearchId?: string;
}) {
  const [shelf, setShelf] = useState<Shelf>("today");
  const [filters, setFilters] = useState<ResearchSearchFilters>(emptyFilters);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [preferences, setPreferences] = useState(defaultResearchPreferences);
  const [readHistory, setReadHistory] = useState<ReadResearch[]>([]);
  const [interactions, setInteractions] = useState<ResearchInteraction[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedResearchFilter[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [pagination, setPagination] = useState({
    key: "",
    count: PAGE_SIZE,
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      getResearchPreferences(),
      getDatabase().readResearch.toArray(),
      getDatabase().researchInteractions.toArray(),
      getDatabase().savedResearchFilters.toArray(),
    ])
      .then(([storedPreferences, storedHistory, storedInteractions, storedFilters]) => {
        if (!active) return;
        setPreferences(storedPreferences);
        setReadHistory(storedHistory);
        setInteractions(storedInteractions);
        setSavedFilters(storedFilters);
      })
      .catch(() => {
        if (!active) return;
        setStorageMessage("無法載入綁定資料，目前先依最新研究排序。");
        setSortMode("newest");
      });
    return () => {
      active = false;
    };
  }, []);

  const ranked = useMemo(
    () =>
      rankResearchForUser(
        research,
        preferences,
        readHistory,
        {},
        interactions,
      ),
    [interactions, preferences, readHistory, research],
  );
  const interactionById = useMemo(
    () => new Map(interactions.map((item) => [item.researchId, item])),
    [interactions],
  );
  const readIds = useMemo(
    () => new Set(readHistory.map((item) => item.researchId)),
    [readHistory],
  );
  const suggestions = useMemo(() => researchSearchSuggestions(research), [research]);

  const shown = useMemo(() => {
    let selected = ranked.filter(({ research: item }) =>
      matchesResearchFilters(item, filters),
    );
    if (shelf === "today") {
      selected = selected.filter(
        (item) => item.research.id === (featuredResearchId ?? research[0]?.id),
      );
    } else if (shelf === "unread") {
      selected = selected.filter((item) => !item.isRead);
    } else if (shelf === "favorites") {
      selected = selected.filter(
        (item) => interactionById.get(item.research.id)?.favorite,
      );
    } else if (shelf === "explore") {
      const preferred = new Set(preferences.categories);
      selected = selected
        .filter(
          (item) =>
            ![...preferred].some(
              (category) => category === item.research.psychologyCategory,
            ),
        )
        .toSorted(
          (left, right) =>
            right.research.publicationDate.localeCompare(
              left.research.publicationDate,
            ) || left.research.id.localeCompare(right.research.id),
        );
    }
    if (shelf === "newest" || sortMode === "newest") {
      return selected.toSorted(
        (left, right) =>
          right.research.publicationDate.localeCompare(
            left.research.publicationDate,
          ) || left.research.id.localeCompare(right.research.id),
      );
    }
    if (sortMode === "unread") {
      return selected.toSorted(
        (left, right) =>
          Number(left.isRead) - Number(right.isRead) ||
          right.score - left.score ||
          left.research.id.localeCompare(right.research.id),
      );
    }
    return selected;
  }, [
    featuredResearchId,
    filters,
    interactionById,
    preferences.categories,
    ranked,
    research,
    shelf,
    sortMode,
  ]);
  const resultKey = JSON.stringify([shelf, sortMode, filters]);
  const visibleCount =
    pagination.key === resultKey ? pagination.count : PAGE_SIZE;
  const visible = shown.slice(0, visibleCount);

  async function handleInteraction(
    researchId: string,
    changes: Partial<Pick<ResearchInteraction, "favorite" | "readLater" | "feedback">>,
  ) {
    const saved = await saveResearchInteraction(researchId, changes);
    setInteractions((current) => [
      ...current.filter((item) => item.researchId !== researchId),
      saved,
    ]);
    setStorageMessage("偏好已更新，推薦排序已重新計算。");
  }

  async function handleSavePreferences(
    input: Omit<ResearchPreferences, "version" | "updatedAt">,
  ) {
    setPreferences(await saveResearchPreferences(input));
    setShowPreferences(false);
    setSortMode("recommended");
    setShelf("recommended");
  }

  async function handleResetPreferences() {
    setPreferences(await resetResearchPreferences());
    await clearResearchInteractions();
    setInteractions([]);
    setShowPreferences(false);
    setStorageMessage("研究偏好與主動回饋已重設。");
  }

  async function handleSaveFilter() {
    if (!filterName.trim()) {
      setStorageMessage("請先輸入篩選名稱。");
      return;
    }
    try {
      const saved = await saveResearchFilter({
        name: filterName.trim(),
        ...filters,
        sortMode,
      });
      setSavedFilters((current) => [...current, saved]);
      setFilterName("");
      setStorageMessage(`已儲存篩選「${saved.name}」。`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "儲存篩選失敗");
    }
  }

  function loadSavedFilter(id: string) {
    const saved = savedFilters.find((item) => item.id === id);
    if (!saved) return;
    setFilters({
      query: saved.query,
      categories: saved.categories,
      studyTypes: saved.studyTypes as ResearchCatalogItem["studyType"][],
      publicationStatuses:
        saved.publicationStatuses as ResearchCatalogItem["publicationStatus"][],
      openAccessOnly: saved.openAccessOnly,
      dateFrom: saved.dateFrom,
      dateTo: saved.dateTo,
    });
    setSortMode(saved.sortMode);
    setShelf("all");
  }

  return (
    <div className="research-explorer">
      <nav className="research-shelves" aria-label="研究內容分區">
        {shelves.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={shelf === item.id}
            onClick={() => setShelf(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="card research-toolbar" aria-label="搜尋與排序研究">
        <form
          className="research-search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="research-search">搜尋研究庫</label>
          <div className="search-input-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              id="research-search"
              type="search"
              list="research-search-suggestions"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="中文、英文、作者或 DOI"
              autoComplete="off"
            />
            <datalist id="research-search-suggestions">
              {suggestions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
          <p className="field-hint">搜尋紀錄不會自動加入你的研究偏好。</p>
        </form>
        <div className="research-toolbar-actions">
          <label className="form-field" htmlFor="research-sort">
            <span>排序方式</span>
            <select
              id="research-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="recommended">推薦優先</option>
              <option value="newest">最新優先</option>
              <option value="unread">未讀優先</option>
            </select>
          </label>
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={showPreferences}
            onClick={() => setShowPreferences((current) => !current)}
          >
            研究偏好
          </button>
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((current) => !current)}
          >
            進階篩選
          </button>
        </div>
      </section>

      {showPreferences ? (
        <ResearchPreferencesPanel
          key={preferences.updatedAt}
          initialPreferences={preferences}
          onSave={handleSavePreferences}
          onReset={handleResetPreferences}
          onCancel={() => setShowPreferences(false)}
        />
      ) : null}

      {showAdvanced ? (
        <section className="card advanced-filters" aria-label="進階研究篩選">
          <fieldset>
            <legend>心理學分類</legend>
            <div className="choice-grid">
              {RESEARCH_CATEGORIES.map((category) => (
                <FilterCheckbox
                  key={category}
                  label={category}
                  checked={filters.categories.includes(category)}
                  onChange={(checked) =>
                    setFilters((current) => ({
                      ...current,
                      categories: toggle(current.categories, category, checked),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>研究類型</legend>
            <div className="choice-grid">
              {STUDY_TYPE_OPTIONS.map((option) => (
                <FilterCheckbox
                  key={option.value}
                  label={option.label}
                  checked={filters.studyTypes.includes(option.value)}
                  onChange={(checked) =>
                    setFilters((current) => ({
                      ...current,
                      studyTypes: toggle(current.studyTypes, option.value, checked),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
          <div className="grid-2">
            <label className="form-field">
              <span>開始日期</span>
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateFrom: event.target.value || null,
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span>結束日期</span>
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateTo: event.target.value || null,
                  }))
                }
              />
            </label>
          </div>
          <div className="choice-grid">
            <FilterCheckbox
              label="已同儕審查"
              checked={filters.publicationStatuses.includes("peer_reviewed")}
              onChange={(checked) =>
                setFilters((current) => ({
                  ...current,
                  publicationStatuses: toggle(
                    current.publicationStatuses,
                    "peer_reviewed",
                    checked,
                  ),
                }))
              }
            />
            <FilterCheckbox
              label="預印本"
              checked={filters.publicationStatuses.includes("preprint")}
              onChange={(checked) =>
                setFilters((current) => ({
                  ...current,
                  publicationStatuses: toggle(
                    current.publicationStatuses,
                    "preprint",
                    checked,
                  ),
                }))
              }
            />
            <FilterCheckbox
              label="有合法免費全文"
              checked={filters.openAccessOnly}
              onChange={(checked) =>
                setFilters((current) => ({ ...current, openAccessOnly: checked }))
              }
            />
          </div>
          <div className="preference-actions">
            <label className="form-field">
              <span>篩選名稱</span>
              <input
                value={filterName}
                maxLength={40}
                onChange={(event) => setFilterName(event.target.value)}
                placeholder="例如：認知心理學回顧"
              />
            </label>
            <button className="button" type="button" onClick={handleSaveFilter}>
              儲存目前篩選
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setFilters(emptyFilters)}
            >
              清除篩選
            </button>
            {savedFilters.length ? (
              <label className="form-field">
                <span>載入常用篩選</span>
                <select defaultValue="" onChange={(event) => loadSavedFilter(event.target.value)}>
                  <option value="" disabled>選擇一組篩選</option>
                  {savedFilters.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="research-results-heading">
        <div>
          <h2 id="research-results-title">
            {shelves.find((item) => item.id === shelf)?.label}
          </h2>
          <p className="muted" role="status" aria-live="polite">
            找到 {shown.length} 篇研究
            {filters.query.trim() ? `，搜尋「${filters.query.trim()}」` : ""}
          </p>
        </div>
        {shelf === "recommended" && hasPersonalizedPreferences(preferences) ? (
          <p className="recommendation-note">
            推薦分數：明確偏好 40%、主動回饋 25%、已讀相似度 20%、
            新穎度 10%、主題探索 5%。
          </p>
        ) : null}
      </div>
      {storageMessage ? <p className="notice">{storageMessage}</p> : null}

      <section className="research-grid" aria-labelledby="research-results-title">
        {shown.length === 0 ? (
          <div className="card research-empty">
            <h2>目前沒有符合的研究</h2>
            <p className="muted">調整搜尋、篩選或內容分區後再試一次。</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setFilters(emptyFilters);
                setShelf("all");
              }}
            >
              查看全部研究
            </button>
          </div>
        ) : (
          visible.map((item) => (
            <ResearchCard
              key={item.research.id}
              ranked={item}
              showReasons={shelf === "recommended"}
              interaction={interactionById.get(item.research.id)}
              onInteraction={(researchId, changes) =>
                void handleInteraction(researchId, changes)
              }
            />
          ))
        )}
      </section>
      {visible.length < shown.length ? (
        <button
          className="button button-secondary button-full"
          type="button"
          onClick={() =>
            setPagination({
              key: resultKey,
              count: visibleCount + PAGE_SIZE,
            })
          }
        >
          載入更多研究（尚有 {shown.length - visible.length} 篇）
        </button>
      ) : null}
      {readIds.size > 0 && shelf === "unread" ? (
        <p className="field-hint">已隱藏 {readIds.size} 篇已讀研究。</p>
      ) : null}
    </div>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="choice-control">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function toggle<T>(items: T[], value: T, checked: boolean): T[] {
  return checked
    ? [...new Set([...items, value])]
    : items.filter((item) => item !== value);
}
