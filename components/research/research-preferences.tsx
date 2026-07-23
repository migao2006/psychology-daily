"use client";

import { useState, type FormEvent } from "react";
import {
  RESEARCH_CATEGORIES,
  STUDY_TYPE_OPTIONS,
  type ResearchPreferences,
} from "@/lib/research/preferences";
import type { StudyType } from "@/lib/schemas/research";

export function ResearchPreferencesPanel({
  initialPreferences,
  onSave,
  onReset,
  onCancel,
}: {
  initialPreferences: ResearchPreferences;
  onSave: (
    preferences: Omit<ResearchPreferences, "version" | "updatedAt">,
  ) => Promise<void>;
  onReset: () => Promise<void>;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<string[]>(
    initialPreferences.categories,
  );
  const [studyTypes, setStudyTypes] = useState<StudyType[]>(
    initialPreferences.studyTypes,
  );
  const [preferPeerReviewed, setPreferPeerReviewed] = useState(
    initialPreferences.preferPeerReviewed,
  );
  const [preferOpenAccess, setPreferOpenAccess] = useState(
    initialPreferences.preferOpenAccess,
  );
  const [learnFromReading, setLearnFromReading] = useState(
    initialPreferences.learnFromReading,
  );
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    try {
      await onSave({
        categories: categories as ResearchPreferences["categories"],
        studyTypes,
        preferPeerReviewed,
        preferOpenAccess,
        learnFromReading,
      });
    } catch {
      setStatus("偏好無法儲存，請確認瀏覽器允許網站資料");
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    setStatus("");
    try {
      await onReset();
    } catch {
      setStatus("無法重新設定偏好");
      setIsSaving(false);
    }
  }

  return (
    <form
      className="card preference-panel"
      aria-label="研究偏好"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="eyebrow">Personalize locally</p>
        <h2>調整你的研究偏好</h2>
        <p className="muted preference-intro">
          選擇想多看一點的主題。偏好與閱讀紀錄只保存在目前瀏覽器。
        </p>
      </div>

      <fieldset>
        <legend>感興趣的主題</legend>
        <div className="choice-grid">
          {RESEARCH_CATEGORIES.map((category) => (
            <label className="choice-control" key={category}>
              <input
                type="checkbox"
                checked={categories.includes(category)}
                onChange={(event) =>
                  setCategories((current) =>
                    event.target.checked
                      ? [...current, category]
                      : current.filter((item) => item !== category),
                  )
                }
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>偏好的研究類型</legend>
        <div className="choice-grid">
          {STUDY_TYPE_OPTIONS.map((option) => (
            <label className="choice-control" key={option.value}>
              <input
                type="checkbox"
                checked={studyTypes.includes(option.value)}
                onChange={(event) =>
                  setStudyTypes((current) =>
                    event.target.checked
                      ? [...current, option.value]
                      : current.filter((item) => item !== option.value),
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>推薦方式</legend>
        <div className="stack compact-stack">
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={learnFromReading}
              onChange={(event) => setLearnFromReading(event.target.checked)}
            />
            <span>
              <strong>參考我的閱讀紀錄</strong>
              <small>讀過相近主題後，提高相關未讀研究的排序。</small>
            </span>
          </label>
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={preferPeerReviewed}
              onChange={(event) =>
                setPreferPeerReviewed(event.target.checked)
              }
            />
            <span>
              <strong>優先已同儕審查</strong>
              <small>預印本仍可搜尋，但推薦排序會較後。</small>
            </span>
          </label>
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={preferOpenAccess}
              onChange={(event) => setPreferOpenAccess(event.target.checked)}
            />
            <span>
              <strong>優先合法免費全文</strong>
              <small>有公開全文的研究會獲得較高推薦分數。</small>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="preference-actions">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "儲存中…" : "儲存偏好"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={isSaving}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className="button button-text"
          type="button"
          disabled={isSaving}
          onClick={handleReset}
        >
          恢復預設
        </button>
      </div>
      <p className="form-status" role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
