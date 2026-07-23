"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { DailyActivity, LessonProgress, ReadResearch, ReviewItem } from "@/lib/schemas/progress";
import { clearProgress, exportProgress, importProgress } from "@/lib/db/backup";
import { getDatabase } from "@/lib/db/database";
import { calculateStreak } from "@/lib/progress/streak";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { CloudBackup } from "./cloud-backup";
import { applyUserSettings, getUserSettings, saveUserSettings } from "@/lib/db/settings";
import { hydrateLegacyReviewItems } from "@/lib/db/reviews";
import Link from "next/link";
export function ProgressDashboard({ lessons, categories }: { lessons: Lesson[]; categories: string[] }) {
  const [rows, setRows] = useState<LessonProgress[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [reads, setReads] = useState<ReadResearch[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [fontSize, setFontSize] = useState("normal");
  const load = useCallback(async () => {
    const db = getDatabase();
    await hydrateLegacyReviewItems(lessons);
    const [progressRows, activityRows, readRows, backupMeta, settings, storedReviewItems] = await Promise.all([db.lessonProgress.toArray(), db.activities.toArray(), db.readResearch.toArray(), db.meta.get("lastBackupAt"), getUserSettings(), db.reviewItems.toArray()]);
    setRows(progressRows); setActivities(activityRows); setReads(readRows); setLastBackupAt(typeof backupMeta?.value === "string" ? backupMeta.value : null);
    setReviewItems(storedReviewItems);
    setTheme(settings.theme); setFontSize(settings.fontSize);
  }, [lessons]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const complete = rows.filter((row) => row.completedAt);
  const correct = rows.reduce((sum, row) => sum + row.correctCount, 0);
  const total = rows.reduce((sum, row) => sum + row.totalCount, 0);
  const streak = calculateStreak(activities.filter((item) => item.completedToday).map((item) => item.date));
  const due = reviewItems.filter((row) => taipeiDateKey(row.nextReviewAt) <= taipeiDateKey());
  const rowMap = useMemo(() => new Map(rows.map((row) => [row.lessonId, row])), [rows]);
  async function downloadBackup() {
    const backup = await exportProgress({ recordLocalBackup: true });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `psychology-daily-backup-${taipeiDateKey()}.json`; anchor.click(); URL.revokeObjectURL(url);
    setLastBackupAt(backup.exportedAt); setMessage("本機備份已下載。");
  }
  async function handleImport(file: File) {
    try { await importProgress(await file.text()); await load(); setMessage("匯入完成，進度已恢復。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "匯入失敗"); }
  }
  async function applyPreference(kind: "theme" | "font-size", value: string) {
    const saved = kind === "theme"
      ? await saveUserSettings({ theme: value as "system" | "light" | "dark" })
      : await saveUserSettings({ fontSize: value as "normal" | "large" | "xlarge" });
    applyUserSettings(saved);
    setTheme(saved.theme);
    setFontSize(saved.fontSize);
  }
  return <div className="stack">
    <section className="metric-grid" aria-label="整體進度"><div className="card metric"><strong>{complete.length}</strong><span>完成課程</span></div><div className="card metric"><strong>{total ? Math.round(correct / total * 100) : 0}%</strong><span>測驗正確率</span></div><div className="card metric"><strong>{reads.length}</strong><span>已讀研究</span></div></section>
    <section className="grid-2"><div className="card"><h2>{streak.current} 天連續學習</h2><p className="muted">最長連續 {streak.longest} 天</p></div><div className="card"><h2>{due.length} 個概念待複習</h2><p className="muted">{due.slice(0, 3).map((row) => lessons.find((lesson) => lesson.id === row.lessonId)?.quiz.find((question) => question.id === row.questionId)?.prompt).filter(Boolean).join("、") || "今天沒有到期項目"}</p><Link className="button button-secondary" href="/review">開啟複習中心</Link></div></section>
    <section className="card"><h2>分類完成比例</h2><div className="stack" style={{ marginTop: "1rem" }}>{categories.map((category) => { const group = lessons.filter((lesson) => lesson.category === category); const done = group.filter((lesson) => rowMap.get(lesson.id)?.completedAt).length; const percent = Math.round(done / group.length * 100); return <div key={category}><div className="meta" style={{ justifyContent: "space-between" }}><span>{category}</span><span>{done}/{group.length} · {percent}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
    <section className="card"><h2>顯示設定</h2><div className="grid-2" style={{ marginTop: "1rem" }}><label className="form-field"><span>色彩模式</span><select value={theme} onChange={(event) => void applyPreference("theme", event.target.value)}><option value="system">跟隨系統</option><option value="light">淺色</option><option value="dark">深色</option></select></label><label className="form-field"><span>字體大小</span><select value={fontSize} onChange={(event) => void applyPreference("font-size", event.target.value)}><option value="normal">標準</option><option value="large">大</option><option value="xlarge">特大</option></select></label></div></section>
    <CloudBackup />
    <section className="card"><h2>可攜式資料副本</h2><p className="muted">你可以額外下載 JSON 副本；匯入後會自動同步至目前綁定。</p><div className="stack"><button className="button" type="button" onClick={downloadBackup}>匯出 JSON</button><label className="file-label">匯入 JSON<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.currentTarget.value = ""; }} /></label></div><p className="muted">最近本機備份：{lastBackupAt ? new Date(lastBackupAt).toLocaleString("zh-TW") : "尚未建立"}</p>{message && <p className="notice" role="status">{message}</p>}</section>
    <section className="card danger-zone"><h2>清除全部學習資料</h2><p className="muted">會清除課程、作答、複習、閱讀與偏好，並同步此變更。</p><button className="button button-danger" type="button" onClick={() => setClearStep(1)}>清除全部資料</button></section>
    {clearStep > 0 && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="clear-title"><h2 id="clear-title">{clearStep === 1 ? "第一次確認" : "最後確認"}</h2><p>{clearStep === 1 ? "這項變更會同步到你的綁定資料。" : "確定要永久清除所有學習資料嗎？"}</p><div className="stack">{clearStep === 1 ? <button className="button button-danger" onClick={() => setClearStep(2)}>我了解，繼續</button> : <button className="button button-danger" onClick={async () => { await clearProgress(); setClearStep(0); setMessage("全部學習資料已清除並排入同步。"); await load(); }}>永久清除全部資料</button>}<button className="button button-secondary" onClick={() => setClearStep(0)}>取消</button></div></div></div>}
  </div>;
}
