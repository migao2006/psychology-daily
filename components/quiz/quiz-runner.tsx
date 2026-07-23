"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@/lib/schemas/lesson";
import type { Familiarity } from "@/lib/schemas/progress";
import { completeLesson } from "@/lib/db/progress";
export function QuizRunner({ lesson, nextLessonSlug }: { lesson: Lesson; nextLessonSlug?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [familiarity, setFamiliarity] = useState<Familiarity>("unsure");
  const [saving, setSaving] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerSnapshot);
  const allAnswered = lesson.quiz.every((question) => selected[question.id] !== undefined);
  const score = useMemo(() => lesson.quiz.filter((question) => selected[question.id] === question.correctIndex).length, [lesson.quiz, selected]);
  async function finish() {
    setSaving(true);
    await completeLesson({ lessonId: lesson.id, familiarity, answers: lesson.quiz.map((question) => ({ questionId: question.id, selectedIndex: selected[question.id], correct: selected[question.id] === question.correctIndex, answeredAt: new Date().toISOString() })) });
    router.push("/"); router.refresh();
  }
  return <section className="card" aria-labelledby="quiz-title"><p className="eyebrow">Quiz</p><h2 id="quiz-title">用 {lesson.quiz.length} 題確認理解</h2><p className="muted">答案送出後才會顯示解析；這不是心理疾病或人格測驗。</p>
    <div className="stack">{lesson.quiz.map((question, qIndex) => <fieldset key={question.id} style={{ border: 0, padding: 0, margin: "1rem 0 0" }}><legend style={{ fontWeight: 800, marginBottom: ".65rem" }}>{qIndex + 1}. {question.prompt}</legend><div className="stack" style={{ gap: ".5rem" }}>{question.options.map((option, index) => {
      const picked = selected[question.id] === index;
      const correct = submitted && index === question.correctIndex;
      const wrong = submitted && picked && index !== question.correctIndex;
      return <button type="button" className="quiz-option" key={option} onClick={() => !submitted && setSelected((current) => ({ ...current, [question.id]: index }))} data-selected={picked} data-correct={correct} data-wrong={wrong} aria-pressed={picked} disabled={!hydrated || submitted}><span className="radio-dot" aria-hidden="true" />{option}</button>;
    })}</div>{submitted && <div className="notice" style={{ marginTop: ".65rem" }}><strong>{selected[question.id] === question.correctIndex ? "答對了。" : "再複習一下。"}</strong> {question.explanation}</div>}</fieldset>)}</div>
    {!submitted ? <button className="button button-full" type="button" disabled={!hydrated || !allAnswered} onClick={() => setSubmitted(true)} style={{ marginTop: "1.2rem", opacity: hydrated && allAnswered ? 1 : .5 }}>送出答案</button> : <div className="stack" style={{ marginTop: "1.2rem" }}><div className="card" style={{ background: "var(--primary-soft)", textAlign: "center" }}><strong style={{ fontSize: "1.6rem" }}>{score} / {lesson.quiz.length}</strong><div>查看過所有答案解析後，儲存本次進度。</div></div><label className="form-field"><span>你對這堂課的確定程度</span><select value={familiarity} onChange={(event) => setFamiliarity(event.target.value as Familiarity)}><option value="unknown">不知道</option><option value="unsure">不太確定</option><option value="certain">確定</option></select></label><button className="button button-full" type="button" onClick={finish} disabled={saving}>{saving ? "儲存至本機…" : "完成課程並儲存進度"}</button>{nextLessonSlug && <Link href={`/learn/${nextLessonSlug}`} className="button button-secondary">先看下一堂課</Link>}</div>}
  </section>;
}

function subscribeToHydration() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}
