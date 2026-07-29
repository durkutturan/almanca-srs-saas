"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_APP_DATA } from "@/data/defaultData";
import { createNewSrs } from "@/lib/srs";
import type {
  AppData,
  NewSentenceInput,
  Sentence,
} from "@/types/app";

const STORAGE_KEY = "cumleSRSPro";

function cloneDefaultData(): AppData {
  return JSON.parse(JSON.stringify(DEFAULT_APP_DATA)) as AppData;
}

function repairAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") {
    return cloneDefaultData();
  }

  const candidate = value as Partial<AppData>;
  const fallback = cloneDefaultData();

  const sentences = Array.isArray(candidate.sentences)
    ? candidate.sentences.map((sentence) => ({
        ...sentence,
        subcat: sentence.subcat ?? "",
        icon: sentence.icon || "💬",
        grammar: sentence.grammar ?? "",
        srs: sentence.srs ?? createNewSrs(),
      }))
    : [];

  return {
    categories:
      Array.isArray(candidate.categories) &&
      candidate.categories.length > 0
        ? candidate.categories
        : fallback.categories,

    sentences,

    stats: {
      streak: candidate.stats?.streak ?? 0,
      lastStudyDay: candidate.stats?.lastStudyDay ?? null,
      days: candidate.stats?.days ?? {},
      notifyEnabled: candidate.stats?.notifyEnabled ?? false,
    },
  };
}

export function useAppData() {
  const [appData, setAppData] = useState<AppData>(() => cloneDefaultData());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(STORAGE_KEY);

      if (savedData) {
        const parsedData = JSON.parse(savedData) as unknown;
        setAppData(repairAppData(parsedData));
      }
    } catch (error) {
      console.error("Kayıtlı veriler okunamadı:", error);
      setAppData(cloneDefaultData());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(appData),
      );
    } catch (error) {
      console.error("Veriler kaydedilemedi:", error);
    }
  }, [appData, isLoaded]);

  const addSentence = useCallback((input: NewSentenceInput): Sentence => {
    const sentence: Sentence = {
      id: Date.now(),
      de: input.de.trim(),
      tr: input.tr.trim(),
      cat: input.category,
      subcat: input.subcategory === "Genel" ? "" : input.subcategory,
      icon: input.icon.trim() || "💬",
      grammar: input.grammar.trim(),
      srs: createNewSrs(),
    };

    setAppData((currentData) => ({
      ...currentData,
      sentences: [...currentData.sentences, sentence],
    }));

    return sentence;
  }, []);

  const deleteSentence = useCallback((sentenceId: number) => {
    setAppData((currentData) => ({
      ...currentData,
      sentences: currentData.sentences.filter(
        (sentence) => sentence.id !== sentenceId,
      ),
    }));
  }, []);

  const totalDue = useMemo(() => {
    const now = Date.now();

    return appData.sentences.filter(
      (sentence) =>
        sentence.srs.reps === 0 ||
        sentence.srs.due <= now,
    ).length;
  }, [appData.sentences]);

  return {
    appData,
    isLoaded,
    addSentence,
    deleteSentence,
    totalDue,
  };
}