const TAIPEI_TIME_ZONE = "Asia/Taipei";

const taipeiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const taipeiDisplayFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

export function taipeiDateKey(input: Date | string | number = new Date()): string {
  return taipeiDateFormatter.format(new Date(input));
}

export function formatTaipeiDate(input: Date | string | number = new Date()): string {
  return taipeiDisplayFormatter.format(new Date(input));
}

export function addTaipeiDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 4);
  return taipeiDateKey(new Date(noonUtc + days * 86_400_000));
}

export function dateKeyDistance(fromDateKey: string, toDateKey: string): number {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(toDateKey) - parse(fromDateKey)) / 86_400_000);
}

export function taipeiEndOfDayIso(dateKey: string): string {
  return new Date(`${dateKey}T15:59:59.999Z`).toISOString();
}

export { TAIPEI_TIME_ZONE };

