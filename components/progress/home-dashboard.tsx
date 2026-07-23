"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { DailyResearch } from "@/lib/schemas/research";
import type { DailyActivity, LessonProgress } from "@/lib/schemas/progress";
import { formatTaipeiDate, taipeiDateKey } from "@/lib/dates/taipei";
import { calculateStreak } from "@/lib/progress/streak";
import { getDatabase } from "@/lib/db/database";

export function HomeDashboard({ lessons, featuredResearch }: { lessons: Lesson[]; featuredResearch: DailyResearch }) {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getDatabase().lessonProgress.toArray(), getDatabase().activities.toArray()]).then(([lessonRows, activityRows]) => {
      if (active) { setProgress(lessonRows); setActivities(activityRows); setReady(true); }
    });
    return () => { active = false; };
  }, []);
  const completedIds = useMemo(() => new Set(progress.filter((item) => item.completedAt).map((item) => item.lessonId)), [progress]);
  const nextLesson = lessons.find((lesson) => !completedIds.has(lesson.id)) ?? lessons.at(-1)!;
  const today = taipeiDateKey();
  const todayActivity = activities.find((item) => item.date === today);
  const streak = calculateStreak(activities.filter((item) => item.completedToday).map((item) => item.date));
  const dueReviews = progress.filter((item) => item.nextReviewAt && taipeiDateKey(item.nextReviewAt) <= today).length;
  return <main id="main-content" className="page">
    <div className="page-heading"><p className="eyebrow">Today · Asia/Taipei</p><h1>今天，理解自己多一點。</h1><p className="lede">{formatTaipeiDate()}，一堂微課加一篇研究，約 10 分鐘完成。</p></div>
    <section className="card card-hero" aria-labelledby="today-lesson-title">
      <div className="meta"><span>今日課程</span><span>第 {nextLesson.sequence} / 30 課</span></div>
      <h2 id="today-lesson-title" style={{ marginTop: ".65rem", fontSize: "1.75rem" }}>{nextLesson.title}</h2>
      <p className="muted">{nextLesson.summary}</p>
      <div className="meta" style={{ marginBottom: "1rem" }}><span>{nextLesson.category}</span><span>約 {nextLesson.estimatedMinutes} 分鐘</span><span>{nextLesson.quiz.length} 題測驗</span></div>
      <Link className="button" href={`/learn/${nextLesson.slug}`} style={{ background: "#fff", color: "#164f42" }}>{completedIds.size === 0 ? "開始第一堂課" : "繼續今日課程"} →</Link>
    </section>
    <div className="section-title"><h2>今天的步調</h2><span className="muted">{ready ? "只存在這個瀏覽器" : "讀取本機進度…"}</span></div>
    <section className="metric-grid" aria-label="學習摘要">
      <div className="card metric"><strong>{streak.current}</strong><span>連續天數</span></div>
      <div className="card metric"><strong>{completedIds.size}</strong><span>完成課程</span></div>
      <div className="card metric"><strong>{dueReviews}</strong><span>待複習</span></div>
    </section>
    <div className="section-title"><h2>今日心理學研究</h2><Link href="/research">研究列表 →</Link></div>
    <article className="card research-card">
      <div><span className="badge">已同儕審查</span></div><h3>{featuredResearch.titleZh}</h3>
      <p className="original-title" lang="en">{featuredResearch.titleOriginal}</p>
      <p className="muted">{featuredResearch.mainFindingsZh[0]} {featuredResearch.mainFindingsZh[1]}</p>
      <div className="meta"><span>{featuredResearch.journalOrRepository}</span><span>{featuredResearch.publicationDate}</span></div>
      <Link className="button button-secondary" href={`/research/${encodeURIComponent(featuredResearch.id)}`}>閱讀繁中整理</Link>
    </article>
    <div className="section-title"><h2>今日完成狀態</h2></div>
    <section className="card stack" style={{ gap: ".7rem" }}>
      <StatusRow done={todayActivity?.completedLesson ?? false} label="完成一堂課與測驗" />
      <StatusRow done={todayActivity?.readResearch ?? false} label="閱讀今日研究" />
    </section>
  </main>;
}
function StatusRow({ done, label }: { done: boolean; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}><span aria-hidden="true" style={{ display: "grid", width: "1.7rem", height: "1.7rem", placeItems: "center", borderRadius: "50%", background: done ? "var(--primary)" : "var(--line)", color: done ? "#fff" : "var(--muted)" }}>{done ? "✓" : "·"}</span><span>{label}</span></div>;
}
