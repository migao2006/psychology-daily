import { addTaipeiDays, taipeiDateKey } from "@/lib/dates/taipei";

export type StreakResult = {
  current: number;
  longest: number;
};

export function calculateStreak(
  activityDates: string[],
  now: Date = new Date(),
): StreakResult {
  const uniqueDates = [...new Set(activityDates)].sort();
  if (uniqueDates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (addTaipeiDays(uniqueDates[index - 1], 1) === uniqueDates[index]) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = taipeiDateKey(now);
  const yesterday = addTaipeiDays(today, -1);
  const latest = uniqueDates.at(-1);
  if (latest !== today && latest !== yesterday) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    if (addTaipeiDays(uniqueDates[index - 1], 1) !== uniqueDates[index]) break;
    current += 1;
  }

  return { current, longest };
}

