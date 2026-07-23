import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonView } from "@/components/course/lesson-view";
import { getLessonBySlug, lessons } from "@/lib/content/lessons";
export function generateStaticParams() { return lessons.map((lesson) => ({ slug: lesson.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLessonBySlug((await params).slug);
  return { title: lesson?.title ?? "找不到課程" };
}
export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = getLessonBySlug((await params).slug);
  if (!lesson) notFound();
  const nextLesson = lessons.find((item) => item.sequence === lesson.sequence + 1);
  return <main id="main-content" className="page"><LessonView lesson={lesson} nextLesson={nextLesson} /></main>;
}
