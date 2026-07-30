"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_APP_DATA } from "@/data/defaultData";
import { computeSrs, createNewSrs } from "@/lib/srs";
import type {
  AppData,
  NewSentenceInput,
  Sentence,
} from "@/types/app";

const STORAGE_KEY = "cumleSRSPro";

type Rating = 0 | 1 | 2 | 3;

type UpdateSentenceInput = {
  de: string;
  tr: string;
  category: string;
  subcategory: string;
  icon: string;
  grammar: string;
};

function cloneDefaultData(): AppData {
  return JSON.parse(
    JSON.stringify(DEFAULT_APP_DATA),
  ) as AppData;
}

function repairAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") {
    return cloneDefaultData();
  }

  const candidate = value as Partial<AppData>;
  const fallback = cloneDefaultData();

  return {
    categories:
      Array.isArray(candidate.categories) &&
      candidate.categories.length > 0
        ? candidate.categories
        : fallback.categories,

    sentences: Array.isArray(candidate.sentences)
      ? candidate.sentences.map((sentence) => ({
          ...sentence,
          subcat: sentence.subcat ?? "",
          icon: sentence.icon || "💬",
          grammar: sentence.grammar ?? "",
          srs: sentence.srs ?? createNewSrs(),
        }))
      : [],

    stats: {
      streak: candidate.stats?.streak ?? 0,
      lastStudyDay:
        candidate.stats?.lastStudyDay ?? null,
      days: candidate.stats?.days ?? {},
      notifyEnabled:
        candidate.stats?.notifyEnabled ?? false,
    },
  };
}

export function useAppData() {
  const [appData, setAppData] = useState<AppData>(
    cloneDefaultData,
  );

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedData =
        window.localStorage.getItem(STORAGE_KEY);

      if (savedData) {
        setAppData(
          repairAppData(JSON.parse(savedData)),
        );
      }
    } catch (error) {
      console.error(error);
      setAppData(cloneDefaultData());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(appData),
    );
  }, [appData, isLoaded]);

  const addSentence = useCallback(
    (input: NewSentenceInput): Sentence => {
      const sentence: Sentence = {
        id: Date.now(),
        de: input.de.trim(),
        tr: input.tr.trim(),
        cat: input.category,
        subcat:
          input.subcategory === "Genel"
            ? ""
            : input.subcategory,
        icon: input.icon.trim() || "💬",
        grammar: input.grammar.trim(),
        srs: createNewSrs(),
      };

      setAppData((current) => ({
        ...current,
        sentences: [
          ...current.sentences,
          sentence,
        ],
      }));

      return sentence;
    },
    [],
  );

  const updateSentence = useCallback(
    (
      sentenceId: number,
      input: UpdateSentenceInput,
    ) => {
      setAppData((current) => ({
        ...current,
        sentences: current.sentences.map(
          (sentence) =>
            sentence.id === sentenceId
              ? {
                  ...sentence,
                  de: input.de.trim(),
                  tr: input.tr.trim(),
                  cat: input.category,
                  subcat:
                    input.subcategory === "Genel"
                      ? ""
                      : input.subcategory,
                  icon:
                    input.icon.trim() || "💬",
                  grammar: input.grammar.trim(),
                }
              : sentence,
        ),
      }));
    },
    [],
  );

  const deleteSentence = useCallback(
    (sentenceId: number) => {
      setAppData((current) => ({
        ...current,
        sentences: current.sentences.filter(
          (sentence) =>
            sentence.id !== sentenceId,
        ),
      }));
    },
    [],
  );

  const rateSentence = useCallback(
    (sentenceId: number, rating: Rating) => {
      setAppData((current) => ({
        ...current,
        sentences: current.sentences.map(
          (sentence) =>
            sentence.id === sentenceId
              ? {
                  ...sentence,
                  srs: computeSrs(
                    sentence.srs,
                    rating,
                  ),
                }
              : sentence,
        ),
      }));
    },
    [],
  );

  const addCategory = useCallback(
    (name: string, icon: string): boolean => {
      const cleanName = name.trim();

      if (!cleanName) {
        return false;
      }

      let added = false;

      setAppData((current) => {
        const exists = current.categories.some(
          (category) =>
            category.name.toLocaleLowerCase(
              "tr-TR",
            ) ===
            cleanName.toLocaleLowerCase("tr-TR"),
        );

        if (exists) {
          window.alert(
            "Bu isimde bir kategori zaten var.",
          );
          return current;
        }

        added = true;

        return {
          ...current,
          categories: [
            ...current.categories,
            {
              name: cleanName,
              icon: icon.trim() || "📁",
              subcats: [],
            },
          ],
        };
      });

      return added;
    },
    [],
  );

  const updateCategory = useCallback(
    (
      oldName: string,
      newName: string,
      icon: string,
    ): boolean => {
      const cleanName = newName.trim();

      if (!cleanName) {
        return false;
      }

      let updated = false;

      setAppData((current) => {
        const duplicate =
          current.categories.some(
            (category) =>
              category.name !== oldName &&
              category.name.toLocaleLowerCase(
                "tr-TR",
              ) ===
                cleanName.toLocaleLowerCase(
                  "tr-TR",
                ),
          );

        if (duplicate) {
          window.alert(
            "Bu isimde başka bir kategori var.",
          );
          return current;
        }

        updated = true;

        return {
          ...current,
          categories: current.categories.map(
            (category) =>
              category.name === oldName
                ? {
                    ...category,
                    name: cleanName,
                    icon: icon.trim() || "📁",
                  }
                : category,
          ),
          sentences: current.sentences.map(
            (sentence) =>
              sentence.cat === oldName
                ? {
                    ...sentence,
                    cat: cleanName,
                  }
                : sentence,
          ),
        };
      });

      return updated;
    },
    [],
  );

  const deleteCategory = useCallback(
    (categoryName: string): boolean => {
      let deleted = false;

      setAppData((current) => {
        if (current.categories.length <= 1) {
          window.alert(
            "Son kategori silinemez.",
          );
          return current;
        }

        const targetCategory =
          current.categories.find(
            (category) =>
              category.name !== categoryName,
          );

        if (!targetCategory) {
          return current;
        }

        deleted = true;

        return {
          ...current,
          categories: current.categories.filter(
            (category) =>
              category.name !== categoryName,
          ),
          sentences: current.sentences.map(
            (sentence) =>
              sentence.cat === categoryName
                ? {
                    ...sentence,
                    cat: targetCategory.name,
                    subcat: "",
                  }
                : sentence,
          ),
        };
      });

      return deleted;
    },
    [],
  );

  const addSubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
    ): boolean => {
      const cleanName = subcategoryName.trim();

      if (
        !cleanName ||
        cleanName.toLocaleLowerCase("tr-TR") ===
          "genel"
      ) {
        if (
          cleanName.toLocaleLowerCase("tr-TR") ===
          "genel"
        ) {
          window.alert(
            "Genel bölümü zaten otomatik bulunur.",
          );
        }

        return false;
      }

      let added = false;

      setAppData((current) => {
        const category =
          current.categories.find(
            (item) =>
              item.name === categoryName,
          );

        if (!category) {
          return current;
        }

        const exists = category.subcats.some(
          (subcategory) =>
            subcategory.toLocaleLowerCase(
              "tr-TR",
            ) ===
            cleanName.toLocaleLowerCase("tr-TR"),
        );

        if (exists) {
          window.alert(
            "Bu alt kategori zaten var.",
          );
          return current;
        }

        added = true;

        return {
          ...current,
          categories: current.categories.map(
            (item) =>
              item.name === categoryName
                ? {
                    ...item,
                    subcats: [
                      ...item.subcats,
                      cleanName,
                    ],
                  }
                : item,
          ),
        };
      });

      return added;
    },
    [],
  );

  const renameSubcategory = useCallback(
    (
      categoryName: string,
      oldName: string,
      newName: string,
    ): boolean => {
      const cleanName = newName.trim();

      if (
        !cleanName ||
        cleanName.toLocaleLowerCase("tr-TR") ===
          "genel"
      ) {
        window.alert(
          "Alt kategori için farklı bir ad yaz.",
        );
        return false;
      }

      let updated = false;

      setAppData((current) => {
        const category =
          current.categories.find(
            (item) =>
              item.name === categoryName,
          );

        if (!category) {
          return current;
        }

        const duplicate = category.subcats.some(
          (subcategory) =>
            subcategory !== oldName &&
            subcategory.toLocaleLowerCase(
              "tr-TR",
            ) ===
              cleanName.toLocaleLowerCase(
                "tr-TR",
              ),
        );

        if (duplicate) {
          window.alert(
            "Bu isimde başka bir alt kategori var.",
          );
          return current;
        }

        updated = true;

        return {
          ...current,
          categories: current.categories.map(
            (item) =>
              item.name === categoryName
                ? {
                    ...item,
                    subcats: item.subcats.map(
                      (subcategory) =>
                        subcategory === oldName
                          ? cleanName
                          : subcategory,
                    ),
                  }
                : item,
          ),
          sentences: current.sentences.map(
            (sentence) =>
              sentence.cat === categoryName &&
              sentence.subcat === oldName
                ? {
                    ...sentence,
                    subcat: cleanName,
                  }
                : sentence,
          ),
        };
      });

      return updated;
    },
    [],
  );

  const deleteSubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
    ): boolean => {
      let deleted = false;

      setAppData((current) => {
        const category =
          current.categories.find(
            (item) =>
              item.name === categoryName,
          );

        if (!category) {
          return current;
        }

        deleted = true;

        return {
          ...current,
          categories: current.categories.map(
            (item) =>
              item.name === categoryName
                ? {
                    ...item,
                    subcats: item.subcats.filter(
                      (subcategory) =>
                        subcategory !==
                        subcategoryName,
                    ),
                  }
                : item,
          ),
          sentences: current.sentences.map(
            (sentence) =>
              sentence.cat === categoryName &&
              sentence.subcat ===
                subcategoryName
                ? {
                    ...sentence,
                    subcat: "",
                  }
                : sentence,
          ),
        };
      });

      return deleted;
    },
    [],
  );

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
    updateSentence,
    deleteSentence,
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    totalDue,
  };
}