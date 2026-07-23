"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDatabase } from "@/lib/db/database";
import { hydrateLegacyReviewItems, submitConceptReview } from "@/lib/db/reviews";
import { taipeiDateKey } from "@/lib/dates/taipei";
import {
  buildReviewOverview,
  type ReviewQueueEntry,
} from "@/lib/review/queue";
import type { Lesson } from "@/lib/schemas/lesson";
import type {
  Familiarity,
  ReviewAttempt,
  ReviewItem,
} from "@/lib/schemas/progress";

export function ReviewCenter({ lessons }: { lessons: Lesson[] }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [attempts, setAttempts] = useState<ReviewAttempt[]>([]);
  const [category, setCategory] = useState("全部");
  const [wrongOnly, setWrongOnly] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [familiarity, setFamiliarity] = useState<Familiarity>("unsure");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    await hydrateLegacyReviewItems(lessons);
    const [storedItems, storedAttempts] = await Promise.all([
      getDatabase().reviewItems.toArray(),
      getDatabase().reviewAttempts.toArray(),
    ]);
    setItems(storedItems);
    setAttempts(storedAttempts);
  }, [lessons]);

  useEffect(() => {
    let active = true;
    void readReviewData(lessons).then(([storedItems, storedAttempts]) => {
      if (!active) return;
      setItems(storedItems);
      setAttempts(storedAttempts);
    });
    return () => {
      active = false;
    };
  }, [lessons]);

  const overview = useMemo(
    () => buildReviewOverview(items, lessons),
    [items, lessons],
  );
  const queue = useMemo(() => {
    const due = [...overview.overdue, ...overview.dueToday];
    return due.filter(
      (entry) =>
        (category === "全部" || entry.lesson.category === category) &&
        (!wrongOnly || entry.item.errorCount > 0),
    );
  }, [category, overview.dueToday, overview.overdue, wrongOnly]);
  const current = queue[0];
  const completedToday = attempts.filter(
    (attempt) => taipeiDateKey(attempt.answeredAt) === taipeiDateKey(),
  ).length;
  const categories = useMemo(
    () => [...new Set(lessons.map((lesson) => lesson.category))],
    [lessons],
  );

  async function submit(entry: ReviewQueueEntry) {
    if (selectedIndex === null) return;
    await submitConceptReview({
      item: entry.item,
      answer: {
        questionId: entry.question.id,
        selectedIndex,
        correct: selectedIndex === entry.question.correctIndex,
        answeredAt: new Date().toISOString(),
      },
      familiarity,
    });
    setSubmitted(true);
    setMessage(
      selectedIndex === entry.question.correctIndex
        ? "答對了，已更新下次複習日期。"
        : "這題會在較短間隔後再次出現。",
    );
  }

  async function nextQuestion() {
    setSelectedIndex(null);
    setFamiliarity("unsure");
    setSubmitted(false);
    setMessage("");
    await load();
  }

  return (
    <div className="stack">
      <section className="metric-grid review-metrics" aria-label="複習摘要">
        <div className="card metric"><strong>{overview.dueToday.length}</strong><span>今日到期</span></div>
        <div className="card metric"><strong>{overview.overdue.length}</strong><span>逾期複習</span></div>
        <div className="card metric"><strong>{completedToday}</strong><span>今日完成</span></div>
        <div className="card metric"><strong>{overview.errorProne.length}</strong><span>容易答錯</span></div>
      </section>

      <section className="card review-controls" aria-label="複習篩選">
        <label className="form-field">
          <span>按分類複習</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="全部">全部分類</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={wrongOnly}
            onChange={(event) => setWrongOnly(event.target.checked)}
          />
          <span>
            <strong>只複習答錯題</strong>
            <small>只顯示曾經答錯的概念</small>
          </span>
        </label>
      </section>

      {current ? (
        <section className="card review-question" aria-labelledby="review-question-title">
          <div className="meta">
            <span className="badge">{current.lesson.category}</span>
            <span>{current.lesson.title}</span>
            {current.overdue ? <span className="badge badge-warm">已逾期</span> : <span className="badge">今日到期</span>}
          </div>
          <h2 id="review-question-title">{current.question.prompt}</h2>
          <div className="stack" role="group" aria-label="作答選項">
            {current.question.options.map((option, index) => {
              const picked = selectedIndex === index;
              const correct = submitted && index === current.question.correctIndex;
              const wrong = submitted && picked && !correct;
              return (
                <button
                  key={option}
                  type="button"
                  className="quiz-option"
                  data-selected={picked}
                  data-correct={correct}
                  data-wrong={wrong}
                  aria-pressed={picked}
                  disabled={submitted}
                  onClick={() => setSelectedIndex(index)}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  {option}
                </button>
              );
            })}
          </div>
          {submitted ? (
            <div className="notice">
              <strong>
                {selectedIndex === current.question.correctIndex ? "答對了。" : "再複習一下。"}
              </strong>{" "}
              {current.question.explanation}
            </div>
          ) : (
            <label className="form-field">
              <span>你有多確定？</span>
              <select
                value={familiarity}
                onChange={(event) => setFamiliarity(event.target.value as Familiarity)}
              >
                <option value="unknown">不知道</option>
                <option value="unsure">不太確定</option>
                <option value="certain">確定</option>
              </select>
            </label>
          )}
          {message ? <p className="form-status" role="status">{message}</p> : null}
          {submitted ? (
            <button className="button button-full" type="button" onClick={nextQuestion}>
              下一題
            </button>
          ) : (
            <button
              className="button button-full"
              type="button"
              disabled={selectedIndex === null}
              onClick={() => void submit(current)}
            >
              送出複習答案
            </button>
          )}
        </section>
      ) : (
        <section className="card review-empty">
          <h2>目前沒有符合條件的到期題目</h2>
          <p className="muted">
            完成課程後，概念會依作答與確定程度安排下一次複習。
          </p>
          {wrongOnly || category !== "全部" ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setWrongOnly(false);
                setCategory("全部");
              }}
            >
              清除複習篩選
            </button>
          ) : null}
        </section>
      )}

      <section className="card">
        <h2>未來七天預計複習量</h2>
        <div className="review-forecast" aria-label="未來七天複習量">
          {overview.nextSevenDays.map((item) => (
            <div key={item.date}>
              <span>{item.date.slice(5)}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>容易答錯的概念</h2>
        {overview.errorProne.length ? (
          <ul className="list-clean">
            {overview.errorProne.slice(0, 8).map((entry) => (
              <li key={entry.item.conceptId}>
                <strong>{entry.question.prompt}</strong>
                <span className="muted"> · 累計答錯 {entry.item.errorCount} 次</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">目前沒有答錯紀錄。</p>
        )}
      </section>
    </div>
  );
}

async function readReviewData(
  lessons: Lesson[],
): Promise<[ReviewItem[], ReviewAttempt[]]> {
  await hydrateLegacyReviewItems(lessons);
  return Promise.all([
    getDatabase().reviewItems.toArray(),
    getDatabase().reviewAttempts.toArray(),
  ]);
}
