import type { AppData } from "@/types/app";

export const DEFAULT_APP_DATA: AppData = {
  categories: [
    {
      name: "Mutfak & Restoran",
      icon: "👨‍🍳",
      subcats: ["Müşteri İletişimi", "Sipariş Alma"],
      subsubcats: {},
    },
    {
      name: "Günlük Konuşma",
      icon: "🗣️",
      subcats: ["Selamlaşma", "Alışveriş"],
      subsubcats: {},
    },
  ],

  sentences: [],

  stats: {
    streak: 0,
    lastStudyDay: null,
    days: {},
    notifyEnabled: false,
  },
};
