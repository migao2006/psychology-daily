import type { DailyResearch, PublicationStatus, StudyType } from "@/lib/schemas/research";
export type ResearchSource = {
  id: string;
  title: string;
  authors: string[];
  publicationDate: string;
  abstract: string;
  originalUrl: string;
  doi: string | null;
  journalOrRepository: string;
  language: string;
  publicationStatus: PublicationStatus;
  studyType: StudyType;
  psychologyCategory: string;
  openAccessUrl: string | null;
  sourceApis: string[];
  retrievedAt: string;
};
export type RankedCandidate = ResearchSource & { score: number; scoreBreakdown: Record<string, number> };
export interface ResearchSummarizer { summarize(input: ResearchSource, featuredDate: string): Promise<DailyResearch>; }

