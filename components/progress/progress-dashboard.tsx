"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/schemas/lesson";
import type { DailyActivity, LessonProgress, ReadResearch } from "@/lib/schemas/progress";
import { clearProgress, exportProgress, importProgress } from "@/lib/db/backup";
import { getDatabase } from "@/lib/db/database";
import { calculateStreak } from "@/lib/progress/streak";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { CloudBackup } from "./cloud-backup";
export function ProgressDashboard({ lessons, categories }: { lessons: Lesson[]; categories: string[] }) {
  const [rows, setRows] = useState<LessonProgress[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [reads, setReads] = useState<ReadResearch[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("normal");
  const load = useCallback(async () => {
    const db = getDatabase();
    const [progressRows, activityRows, readRows, backupMeta] = await Promise.all([db.lessonProgress.toArray(), db.activities.toArray(), db.readResearch.toArray(), db.meta.get("lastBackupAt")]);
    setRows(progressRows); setActivities(activityRows); setReads(readRows); setLastBackupAt(typeof backupMeta?.value === "string" ? backupMeta.value : null);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(document.documentElement.dataset.theme ?? "light");
      setFontSize(document.documentElement.dataset.fontSize ?? "normal");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const complete = rows.filter((row) => row.completedAt);
  const correct = rows.reduce((sum, row) => sum + row.correctCount, 0);
  const total = rows.reduce((sum, row) => sum + row.totalCount, 0);
  const streak = calculateStreak(activities.filter((item) => item.completedToday).map((item) => item.date));
  const due = rows.filter((row) => row.nextReviewAt && taipeiDateKey(row.nextReviewAt) <= taipeiDateKey());
  const rowMap = useMemo(() => new Map(rows.map((row) => [row.lessonId, row])), [rows]);
  async function downloadBackup() {
    const backup = await exportProgress();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `psychology-daily-backup-${taipeiDateKey()}.json`; anchor.click(); URL.revokeObjectURL(url);
    setLastBackupAt(backup.exportedAt); setMessage("備份已下載。");
  }
  async function handleImport(file: File) {
    try { await importProgress(await file.text()); await load(); setMessage("匯入完成，進度已恢復。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "匯入失敗"); }
  }
  function applyPreference(kind: "theme" | "font-size", value: string) {
    localStorage.setItem(`psychology-daily:${kind}`, value);
    if (kind === "theme") { document.documentElement.dataset.theme = value; setTheme(value); }
    else { document.documentElement.dataset.fontSize = value; setFontSize(value); }
  }
  return <div className="stack">
    <section className="metric-grid" aria-label="整體進度"><div className="card metric"><strong>{complete.length}</strong><span>完成課程</span></div><div className="card metric"><strong>{total ? Math.round(correct / total * 100) : 0}%</strong><span>測驗正確率</span></div><div className="card metric"><strong>{reads.length}</strong><span>已讀研究</span></div></section>
    <section className="grid-2"><div className="card"><p className="eyebrow">Current</p><h2>{streak.current} 天連續學習</h2><p className="muted">最長連續 {streak.longest} 天</p></div><div className="card"><p className="eyebrow">Review</p><h2>{due.length} 個概念待複習</h2><p className="muted">{due.slice(0, 3).map((row) => lessons.find((lesson) => lesson.id === row.lessonId)?.title).filter(Boolean).join("、") || "今天沒有到期項目"}</p></div></section>
    <section className="card"><h2>分類完成比例</h2><div className="stack" style={{ marginTop: "1rem" }}>{categories.map((category) => { const group = lessons.filter((lesson) => lesson.category === category); const done = group.filter((lesson) => rowMap.get(lesson.id)?.completedAt).length; const percent = Math.round(done / group.length * 100); return <div key={category}><div className="meta" style={{ justifyContent: "space-between" }}><span>{category}</span><span>{done}/{group.length} · {percent}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
    <section className="card"><h2>顯示設定</h2><div className="grid-2" style={{ marginTop: "1rem" }}><label className="form-field"><span>深色模式</span><select value={theme} onChange={(event) => applyPreference("theme", event.target.value)}><option value="light">淺色</option><option value="dark">深色</option></select></label><label className="form-field"><span>字體大小</span><select value={fontSize} onChange={(event) => applyPreference("font-size", event.target.value)}><option value="normal">標準</option><option value="large">大</option><option value="xlarge">特大</option></select></label></div></section>
    <section className="card"><h2>本機資料備份</h2><p className="muted">清除瀏覽器資料或更換裝置可能造成進度遺失，請定期匯出備份。</p><div className="stack"><button className="button" type="button" onClick={downloadBackup}>匯出 JSON</button><label className="file-label">匯入 JSON<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleImport(file); event.currentTarget.value = ""; }} /></label></div><p className="muted">最後備份：{lastBackupAt ? new Date(lastBackupAt).toLocaleString("zh-TW") : "尚未備份"}</p>{message && <p className="notice" role="status">{message}</p>}</section>
    <CloudBackup onRestored={load} />
    <section className="card danger-zone"><h2>清除全部本機資料</h2><p className="muted">會刪除課程、作答、複習、閱讀與連續學習紀錄，且無法復原。</p><button className="button button-danger" type="button" onClick={() => setClearStep(1)}>清除全部資料</button></section>
    {clearStep > 0 && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="clear-title"><h2 id="clear-title">{clearStep === 1 ? "第一次確認" : "最後確認"}</h2><p>{clearStep === 1 ? "資料只存在這個瀏覽器。若沒有備份，清除後無法復原。" : "確定要永久清除所有本機學習資料嗎？"}</p><div className="stack">{clearStep === 1 ? <button className="button button-danger" onClick={() => setClearStep(2)}>我了解，繼續</button> : <button className="button button-danger" onClick={async () => { await clearProgress(); setClearStep(0); setMessage("全部本機資料已清除。"); await load(); }}>永久清除本機資料</button>}<button className="button button-secondary" onClick={() => setClearStep(0)}>取消</button></div></div></div>}
  </div>;
}
