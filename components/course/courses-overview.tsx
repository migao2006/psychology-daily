"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { LessonProgress } from "@/lib/schemas/progress";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { getDatabase } from "@/lib/db/database";
export function CoursesOverview({ lessons, categories }: { lessons: Lesson[]; categories: string[] }) {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  useEffect(() => { getDatabase().lessonProgress.toArray().then(setProgress); }, []);
  const progressMap = useMemo(() => new Map(progress.map((row) => [row.lessonId, row])), [progress]);
  const today = taipeiDateKey();
  return <div className="stack">{categories.map((category) => {
    const group = lessons.filter((lesson) => lesson.category === category);
    const completed = group.filter((lesson) => progressMap.get(lesson.id)?.completedAt).length;
    const next = group.find((lesson) => !progressMap.get(lesson.id)?.completedAt) ?? group.at(-1);
    const due = group.filter((lesson) => { const date = progressMap.get(lesson.id)?.nextReviewAt; return date && taipeiDateKey(date) <= today; }).length;
    const percent = Math.round((completed / group.length) * 100);
    return <section className="card course-row" key={category}>
      <div className="course-row-header"><div><h2>{category}</h2><p className="muted">{completed} / {group.length} 堂完成</p></div>{due > 0 && <span className="badge badge-warm">{due} 待複習</span>}</div>
      <div className="progress-track" aria-label={`${category} 完成 ${percent}%`}><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
      <div className="meta"><span>完成 {percent}%</span><span>下一堂：{next?.title ?? "已完成"}</span></div>
      {next && <Link className="button button-secondary" href={`/learn/${next.slug}`}>{completed === group.length ? "再次複習" : "開始下一堂"}</Link>}
    </section>;
  })}</div>;
}
