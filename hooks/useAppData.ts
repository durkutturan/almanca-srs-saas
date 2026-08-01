"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_APP_DATA } from "@/data/defaultData";
import {
  getPlanLimits,
  hasReachedLimit,
  type AccessLevel,
} from "@/lib/planLimits";
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

function normalizeSubcategory(
  value: string | null | undefined,
): string {
  const cleanValue = value?.trim() ?? "";

  return cleanValue.toLocaleLowerCase("tr-TR") ===
    "genel"
    ? ""
    : cleanValue;
}

function cleanCategories(
  categories: AppData["categories"],
): AppData["categories"] {
  return categories.map((category) => ({
    ...category,
    subcats: Array.from(
      new Set(
        (category.subcats ?? [])
          .map((subcategory) =>
            subcategory.trim(),
          )
          .filter(
            (subcategory) =>
              Boolean(subcategory) &&
              subcategory.toLocaleLowerCase(
                "tr-TR",
              ) !== "genel",
          ),
      ),
    ),
  }));
}

function cloneDefaultData(): AppData {
  const cloned = JSON.parse(
    JSON.stringify(DEFAULT_APP_DATA),
  ) as AppData;

  return {
    ...cloned,
    categories: cleanCategories(
      cloned.categories,
    ),
    sentences: cloned.sentences.map(
      (sentence) => ({
        ...sentence,
        subcat: normalizeSubcategory(
          sentence.subcat,
        ),
      }),
    ),
  };
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
        ? cleanCategories(candidate.categories)
        : fallback.categories,

    sentences: Array.isArray(candidate.sentences)
      ? candidate.sentences.map((sentence) => ({
          ...sentence,
          subcat: normalizeSubcategory(
            sentence.subcat,
          ),
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

export function useAppData(
  accessLevel: AccessLevel = "pro",
) {
  const [appData, setAppData] = useState<AppData>(
    cloneDefaultData,
  );

  const [isLoaded, setIsLoaded] = useState(false);

  /*
   * Toplu ekleme sırasında aynı anda gelen işlemlerin
   * güncel sayıları görmesi için verinin son hâli ref'te
   * de tutulur.
   */
  const appDataRef = useRef(appData);

  const planLimits = useMemo(
    () => getPlanLimits(accessLevel),
    [accessLevel],
  );

  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

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
      const current = appDataRef.current;

      const sentence: Sentence = {
        id: Date.now(),
        de: input.de.trim(),
        tr: input.tr.trim(),
        cat: input.category,
        subcat: normalizeSubcategory(
          input.subcategory,
        ),
        icon: input.icon.trim() || "💬",
        grammar: input.grammar.trim(),
        srs: createNewSrs(),
      };

      if (
        hasReachedLimit(
          current.sentences.length,
          planLimits.maxSentences,
        )
      ) {
        window.alert(
          `Free planda en fazla ${planLimits.maxSentences} cümle ekleyebilirsin. Mevcut cümlelerin silinmez. Daha fazla cümle için Pro plana geçmelisin.`,
        );

        return sentence;
      }

      const nextData: AppData = {
        ...current,
        sentences: [
          ...current.sentences,
          sentence,
        ],
      };

      appDataRef.current = nextData;
      setAppData(nextData);

      return sentence;
    },
    [planLimits.maxSentences],
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
                    normalizeSubcategory(
                      input.subcategory,
                    ),
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

      const current = appDataRef.current;

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
        return false;
      }

      if (
        hasReachedLimit(
          current.categories.length,
          planLimits.maxCategories,
        )
      ) {
        window.alert(
          `Free planda en fazla ${planLimits.maxCategories} kategori oluşturabilirsin. Mevcut kategorilerin silinmez. Daha fazla kategori için Pro plana geçmelisin.`,
        );

        return false;
      }

      const nextData: AppData = {
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

      appDataRef.current = nextData;
      setAppData(nextData);

      return true;
    },
    [planLimits.maxCategories],
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

      if (!cleanName) {
        return false;
      }

      if (
        cleanName.toLocaleLowerCase("tr-TR") ===
        "genel"
      ) {
        window.alert(
          "“Genel” artık kullanılmıyor. Farklı bir alt kategori adı yaz.",
        );
        return false;
      }

      const current = appDataRef.current;

      const category =
        current.categories.find(
          (item) =>
            item.name === categoryName,
        );

      if (!category) {
        return false;
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
        return false;
      }

      if (
        hasReachedLimit(
          category.subcats.length,
          planLimits.maxSubcategoriesPerCategory,
        )
      ) {
        window.alert(
          `Free planda bir kategoride en fazla ${planLimits.maxSubcategoriesPerCategory} alt kategori oluşturabilirsin. Mevcut alt kategorilerin silinmez. Daha fazlası için Pro plana geçmelisin.`,
        );

        return false;
      }

      const nextData: AppData = {
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

      appDataRef.current = nextData;
      setAppData(nextData);

      return true;
    },
    [
      planLimits.maxSubcategoriesPerCategory,
    ],
  );

  const renameSubcategory = useCallback(
    (
      categoryName: string,
      oldName: string,
      newName: string,
    ): boolean => {
      const cleanName = newName.trim();

      if (!cleanName) {
        window.alert(
          "Alt kategori adı boş bırakılamaz.",
        );
        return false;
      }

      if (
        cleanName.toLocaleLowerCase("tr-TR") ===
        "genel"
      ) {
        window.alert(
          "“Genel” artık kullanılmıyor. Farklı bir alt kategori adı yaz.",
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

  const resetStudyProgress = useCallback(() => {
    const approved = window.confirm(
      "Tüm çalışma ilerlemesi sıfırlanacak.\n\nCümleler ve kategoriler silinmeyecek. Devam edilsin mi?",
    );
  
    if (!approved) {
      return;
    }
  
    setAppData((current) => ({
      ...current,
  
      sentences: current.sentences.map((sentence) => ({
        ...sentence,
        srs: createNewSrs(),
      })),
  
      stats: {
        streak: 0,
        lastStudyDay: null,
        days: {},
        notifyEnabled:
          current.stats.notifyEnabled ?? false,
      },
    }));
  
    window.alert(
      "Çalışma ilerlemesi sıfırlandı. Cümleler ve kategoriler korundu.",
    );
  }, []);


  const resetCategorySrs = useCallback(
    (categoryName: string) => {
      setAppData((current) => ({
        ...current,
        sentences: current.sentences.map(
          (sentence) =>
            sentence.cat === categoryName
              ? {
                  ...sentence,
                  srs: createNewSrs(),
                }
              : sentence,
        ),
      }));
    },
    [],
  );

  const resetSubcategorySrs = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
    ) => {
      setAppData((current) => ({
        ...current,
        sentences: current.sentences.map(
          (sentence) =>
            sentence.cat === categoryName &&
            sentence.subcat ===
              subcategoryName
              ? {
                  ...sentence,
                  srs: createNewSrs(),
                }
              : sentence,
        ),
      }));
    },
    [],
  );

  const replaceAppData = useCallback(
    (newData: AppData) => {
      const repairedData =
        repairAppData(newData);

      appDataRef.current = repairedData;
      setAppData(repairedData);
    },
    [],
  );

  const clearLocalData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error(
        "Yerel veriler temizlenemedi:",
        error,
      );
    }

    const defaultData =
      cloneDefaultData();

    appDataRef.current = defaultData;
    setAppData(defaultData);
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
    resetStudyProgress,
    resetCategorySrs,
    resetSubcategorySrs,
    updateSentence,
    deleteSentence,
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    replaceAppData,
    clearLocalData,
    totalDue,
    planLimits,
    accessLevel,
  };
}