export type PageName =
  | "cumle"
  | "kart"
  | "study"
  | "stat"
  | "liste";

export type StudyMode =
  | "flash"
  | "type"
  | "cloze"
  | "mix"
  | "listen";

export type StudyDirection = "de-tr" | "tr-de";

export type SrsData = {
  due: number;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  last: number | null;
};

export type Category = {
  name: string;
  icon: string;
  subcats: string[];
};

export type Sentence = {
  id: number;
  de: string;
  tr: string;
  cat: string;
  subcat: string;
  icon: string;
  grammar: string;
  srs: SrsData;
};

export type DailyStat = {
  correct: number;
  wrong: number;
  total: number;
};

export type AppStats = {
  streak: number;
  lastStudyDay: string | null;
  days: Record<string, DailyStat>;
  notifyEnabled: boolean;
};

export type AppData = {
  categories: Category[];
  sentences: Sentence[];
  stats: AppStats;
};

export type NewSentenceInput = {
  de: string;
  tr: string;
  category: string;
  subcategory: string;
  icon: string;
  grammar: string;
};