import lessons01To10 from "@/content/lessons/lessons-01-10.json";
import lessons11To20 from "@/content/lessons/lessons-11-20.json";
import lessons21To30 from "@/content/lessons/lessons-21-30.json";
import { lessonsSchema, type Lesson } from "@/lib/schemas/lesson";

const parsedLessons = lessonsSchema.parse([
  ...lessons01To10,
  ...lessons11To20,
  ...lessons21To30,
]);

export const lessons: Lesson[] = parsedLessons;

export const lessonCategories = [
  "心理學基礎",
  "認知心理學",
  "社會心理學",
  "人格心理學",
  "發展心理學",
  "學習與記憶",
  "情緒與壓力",
  "人際關係",
  "心理健康常識",
  "研究方法與統計思維",
] as const;

export function getLessonBySlug(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function getLessonsByCategory(category: string): Lesson[] {
  return lessons.filter((lesson) => lesson.category === category);
}

