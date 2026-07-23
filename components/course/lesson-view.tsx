import type { Lesson } from "@/lib/schemas/lesson";
import { QuizRunner } from "@/components/quiz/quiz-runner";
export function LessonView({ lesson, nextLesson }: { lesson: Lesson; nextLesson?: Lesson }) {
  return <article className="lesson-article">
    <header className="page-heading"><p className="eyebrow">第 {lesson.sequence} 課 · {lesson.category}</p><h1>{lesson.title}</h1><p className="lede">{lesson.summary}</p><div className="meta" style={{ marginTop: ".8rem" }}><span>約 {lesson.estimatedMinutes} 分鐘</span><span>難度 {lesson.difficulty} / 3</span><span>證據更新 {lesson.evidenceUpdatedAt}</span></div></header>
    <section className="card card-hero"><p className="eyebrow" style={{ color: "#d8fff3" }}>一句話定義</p><h2>{lesson.definition}</h2></section>
    <ContentSection title="白話解釋"><p>{lesson.explanation}</p></ContentSection>
    <section className="card callout"><h2>生活情境</h2><p>{lesson.dailyExample}</p></section>
    <ContentSection title="常見誤解"><ul className="list-clean">{lesson.commonMisconceptions.map((item) => <li key={item}>{item}</li>)}</ul></ContentSection>
    <ContentSection title="目前研究證據"><div className="stack">{lesson.currentEvidence.map((item) => <div key={item.claim}><span className="badge">{evidenceLabel[item.evidenceLevel]}</span><p style={{ marginTop: ".5rem" }}>{item.claim}</p><p className="muted">限制：{item.limitations}</p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 750 }}>查看證據來源 ↗</a></div>)}</div></ContentSection>
    <ContentSection title="實際應用"><ul className="list-clean">{lesson.applications.map((item) => <li key={item}>{item}</li>)}</ul></ContentSection>
    <QuizRunner lesson={lesson} nextLessonSlug={nextLesson?.slug} />
    <ContentSection title="參考資料"><ol className="list-clean">{lesson.references.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 700 }}>{reference.title}</a>{reference.authors?.length ? ` — ${reference.authors.join(", ")}` : ""}{reference.year ? ` (${reference.year})` : ""}{reference.doi ? <><br /><span className="muted">DOI：{reference.doi}</span></> : null}<br /><span className="muted">{reference.source}</span></li>)}</ol></ContentSection>
    <p className="notice">本課為心理學教育內容，不構成醫療、心理治療或診斷建議。</p>
  </article>;
}
const evidenceLabel = { established: "核心證據", supported: "多項支持", mixed: "結果不一致", emerging: "近期發展" };
function ContentSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h2>{title}</h2>{children}</section>; }
