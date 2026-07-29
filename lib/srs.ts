import type { SrsData } from "@/types/app";

export const DAY_IN_MS = 86_400_000;

export function createNewSrs(): SrsData {
  return {
    due: Date.now(),
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    last: null,
  };
}

export function hasCloze(text: string): boolean {
  return /\*[^*]+\*/.test(text);
}

export function plainText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}

export function getClozeWords(text: string): string[] {
  const matches = text.match(/\*([^*]+)\*/g) ?? [];

  return matches.map((word) => word.replace(/\*/g, ""));
}

export function getTodayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getSrsStatus(srs: SrsData): "new" | "due" | "learning" | "ok" {
  if (srs.reps === 0) {
    return "new";
  }

  if (srs.due <= Date.now()) {
    return "due";
  }

  if (srs.reps < 3) {
    return "learning";
  }

  return "ok";
}

export function computeSrs(srs: SrsData, quality: 0 | 1 | 2 | 3): SrsData {
  const next: SrsData = { ...srs };

  if (quality === 0) {
    next.reps = 0;
    next.interval = 0;
    next.lapses = (next.lapses || 0) + 1;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.due = Date.now() + 10 * 60_000;
  } else {
    next.reps = (next.reps || 0) + 1;

    if (quality === 1) {
      next.ease = Math.max(1.3, next.ease - 0.15);
    } else if (quality === 3) {
      next.ease += 0.15;
    }

    if (next.reps === 1) {
      next.interval = quality === 3 ? 3 : 1;
    } else if (next.reps === 2) {
      next.interval =
        quality === 1
          ? 3
          : quality === 2
            ? 6
            : 10;
    } else {
      const multiplier = quality === 1 ? 1.2 : next.ease;

      next.interval = Math.round(next.interval * multiplier);

      if (quality === 3) {
        next.interval = Math.round(next.interval * 1.3);
      }
    }

    next.interval = Math.max(1, next.interval);
    next.due = Date.now() + next.interval * DAY_IN_MS;
  }

  next.last = Date.now();

  return next;
}