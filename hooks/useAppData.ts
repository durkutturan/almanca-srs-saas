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
  Category,
  NewSentenceInput,
  Sentence,
} from "@/types/app";

const STORAGE_KEY = "cumleSRSPro";

type Rating = 0 | 1 | 2 | 3;

export type SentenceDestination = {
  category: string;
  subcategory?: string;
  subsubcategory?: string;
};

export type DeleteGroupOptions = {
  sentenceAction: "delete" | "move";
  target?: SentenceDestination;
};

type UpdateSentenceInput = {
  de: string;
  tr: string;
  category: string;
  subcategory: string;
  subsubcategory?: string;
  icon: string;
  grammar: string;
};

function normalizeSubcategory(
  value: string | null | undefined,
): string {
  const cleanValue = value?.trim() ?? "";

  return cleanValue.toLocaleLowerCase("tr-TR") === "genel"
    ? ""
    : cleanValue;
}

function normalizeSubsubcategory(
  value: string | null | undefined,
): string {
  return value?.trim() ?? "";
}

function uniqueNames(values: unknown[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    if (typeof value !== "string") {
      return;
    }

    const clean = value.trim();
    if (!clean || clean.toLocaleLowerCase("tr-TR") === "genel") {
      return;
    }

    const key = clean.toLocaleLowerCase("tr-TR");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  });

  return result;
}

function cleanCategory(category: Category): Category {
  const subcats = uniqueNames(category.subcats ?? []);
  const rawSubsubcats =
    category.subsubcats && typeof category.subsubcats === "object"
      ? category.subsubcats
      : {};

  const subsubcats: Record<string, string[]> = {};

  subcats.forEach((subcategory) => {
    subsubcats[subcategory] = uniqueNames(
      Array.isArray(rawSubsubcats[subcategory])
        ? rawSubsubcats[subcategory]
        : [],
    );
  });

  return {
    ...category,
    name: category.name.trim(),
    icon: category.icon?.trim() || "📁",
    subcats,
    subsubcats,
  };
}

function cleanCategories(
  categories: AppData["categories"],
): AppData["categories"] {
  return categories
    .filter(
      (category) =>
        category &&
        typeof category.name === "string" &&
        Boolean(category.name.trim()),
    )
    .map(cleanCategory);
}

function normalizeSentence(sentence: Sentence): Sentence {
  const subcat = normalizeSubcategory(sentence.subcat);

  return {
    ...sentence,
    subcat,
    subsubcat: subcat
      ? normalizeSubsubcategory(sentence.subsubcat)
      : "",
    icon: sentence.icon || "💬",
    grammar: sentence.grammar ?? "",
    srs: sentence.srs ?? createNewSrs(),
  };
}

function cloneDefaultData(): AppData {
  const cloned = JSON.parse(
    JSON.stringify(DEFAULT_APP_DATA),
  ) as AppData;

  return {
    ...cloned,
    categories: cleanCategories(cloned.categories),
    sentences: cloned.sentences.map(normalizeSentence),
  };
}

function repairAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") {
    return cloneDefaultData();
  }

  const candidate = value as Partial<AppData>;
  const fallback = cloneDefaultData();

  const categories =
    Array.isArray(candidate.categories) && candidate.categories.length > 0
      ? cleanCategories(candidate.categories)
      : fallback.categories;

  const sentences = Array.isArray(candidate.sentences)
    ? candidate.sentences.map((sentence) =>
        normalizeSentence(sentence as Sentence),
      )
    : [];

  /*
   * Eski kayıtlarda subsubcats/subsubcat yoktur. Cümlede görülen
   * kategori yollarını kategori ağacına ekleyerek veri kaybını önleriz.
   */
  const normalizedCategories = categories.map((category) => ({
    ...category,
    subcats: [...category.subcats],
    subsubcats: { ...(category.subsubcats ?? {}) },
  }));

  sentences.forEach((sentence) => {
    const category = normalizedCategories.find(
      (item) => item.name === sentence.cat,
    );

    if (!category || !sentence.subcat) {
      return;
    }

    if (!category.subcats.includes(sentence.subcat)) {
      category.subcats.push(sentence.subcat);
    }

    category.subsubcats ??= {};
    category.subsubcats[sentence.subcat] ??= [];

    if (
      sentence.subsubcat &&
      !category.subsubcats[sentence.subcat].includes(
        sentence.subsubcat,
      )
    ) {
      category.subsubcats[sentence.subcat].push(
        sentence.subsubcat,
      );
    }
  });

  return {
    categories: normalizedCategories,
    sentences,
    stats: {
      streak: candidate.stats?.streak ?? 0,
      lastStudyDay: candidate.stats?.lastStudyDay ?? null,
      days: candidate.stats?.days ?? {},
      notifyEnabled: candidate.stats?.notifyEnabled ?? false,
    },
  };
}

function categoryHasName(
  values: string[],
  name: string,
  ignore?: string,
): boolean {
  const key = name.toLocaleLowerCase("tr-TR");

  return values.some(
    (value) =>
      value !== ignore &&
      value.toLocaleLowerCase("tr-TR") === key,
  );
}

function getDestination(
  destination: SentenceDestination,
): Required<SentenceDestination> {
  const subcategory = normalizeSubcategory(destination.subcategory);
  const subsubcategory = subcategory
    ? normalizeSubsubcategory(destination.subsubcategory)
    : "";

  return {
    category: destination.category.trim(),
    subcategory,
    subsubcategory,
  };
}

function isValidDestination(
  data: AppData,
  destination: Required<SentenceDestination>,
): boolean {
  const category = data.categories.find(
    (item) => item.name === destination.category,
  );

  if (!category) {
    return false;
  }

  if (!destination.subcategory) {
    return !destination.subsubcategory;
  }

  if (!category.subcats.includes(destination.subcategory)) {
    return false;
  }

  if (!destination.subsubcategory) {
    return true;
  }

  return (category.subsubcats?.[destination.subcategory] ?? []).includes(
    destination.subsubcategory,
  );
}

export function useAppData(
  accessLevel: AccessLevel = "pro",
) {
  const [appData, setAppData] = useState<AppData>(cloneDefaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const appDataRef = useRef(appData);

  const planLimits = useMemo(
    () => getPlanLimits(accessLevel),
    [accessLevel],
  );

  const commit = useCallback((nextData: AppData) => {
    appDataRef.current = nextData;
    setAppData(nextData);
  }, []);

  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(STORAGE_KEY);

      if (savedData) {
        const repaired = repairAppData(JSON.parse(savedData));
        appDataRef.current = repaired;
        setAppData(repaired);
      }
    } catch (error) {
      console.error(error);
      const fallback = cloneDefaultData();
      appDataRef.current = fallback;
      setAppData(fallback);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }, [appData, isLoaded]);

  const addSentence = useCallback(
    (input: NewSentenceInput): Sentence => {
      const current = appDataRef.current;
      const subcat = normalizeSubcategory(input.subcategory);
      const subsubcat = subcat
        ? normalizeSubsubcategory(input.subsubcategory)
        : "";

      const nextId = Math.max(
        Date.now(),
        current.sentences.length > 0
          ? Math.max(...current.sentences.map((item) => item.id)) + 1
          : 1,
      );

      const sentence: Sentence = {
        id: nextId,
        de: input.de.trim(),
        tr: input.tr.trim(),
        cat: input.category,
        subcat,
        subsubcat,
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

      commit({
        ...current,
        sentences: [...current.sentences, sentence],
      });

      return sentence;
    },
    [commit, planLimits.maxSentences],
  );

  const updateSentence = useCallback(
    (sentenceId: number, input: UpdateSentenceInput) => {
      const current = appDataRef.current;
      const subcat = normalizeSubcategory(input.subcategory);

      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          sentence.id === sentenceId
            ? {
                ...sentence,
                de: input.de.trim(),
                tr: input.tr.trim(),
                cat: input.category,
                subcat,
                subsubcat: subcat
                  ? normalizeSubsubcategory(input.subsubcategory)
                  : "",
                icon: input.icon.trim() || "💬",
                grammar: input.grammar.trim(),
              }
            : sentence,
        ),
      });
    },
    [commit],
  );

  const deleteSentence = useCallback(
    (sentenceId: number) => {
      const current = appDataRef.current;
      commit({
        ...current,
        sentences: current.sentences.filter(
          (sentence) => sentence.id !== sentenceId,
        ),
      });
    },
    [commit],
  );

  const deleteSentences = useCallback(
    (sentenceIds: number[]) => {
      const idSet = new Set(sentenceIds);
      const current = appDataRef.current;

      commit({
        ...current,
        sentences: current.sentences.filter(
          (sentence) => !idSet.has(sentence.id),
        ),
      });
    },
    [commit],
  );

  const moveSentences = useCallback(
    (
      sentenceIds: number[],
      destination: SentenceDestination,
    ): boolean => {
      if (sentenceIds.length === 0) {
        return false;
      }

      const current = appDataRef.current;
      const target = getDestination(destination);

      if (!isValidDestination(current, target)) {
        window.alert("Taşınacak hedef kategori yolu artık mevcut değil.");
        return false;
      }

      const idSet = new Set(sentenceIds);

      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          idSet.has(sentence.id)
            ? {
                ...sentence,
                cat: target.category,
                subcat: target.subcategory,
                subsubcat: target.subsubcategory,
              }
            : sentence,
        ),
      });

      return true;
    },
    [commit],
  );

  const rateSentence = useCallback(
    (sentenceId: number, rating: Rating) => {
      const current = appDataRef.current;

      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          sentence.id === sentenceId
            ? {
                ...sentence,
                srs: computeSrs(sentence.srs, rating),
              }
            : sentence,
        ),
      });
    },
    [commit],
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
          category.name.toLocaleLowerCase("tr-TR") ===
          cleanName.toLocaleLowerCase("tr-TR"),
      );

      if (exists) {
        window.alert("Bu isimde bir kategori zaten var.");
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

      commit({
        ...current,
        categories: [
          ...current.categories,
          {
            name: cleanName,
            icon: icon.trim() || "📁",
            subcats: [],
            subsubcats: {},
          },
        ],
      });

      return true;
    },
    [commit, planLimits.maxCategories],
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

      const current = appDataRef.current;
      const duplicate = current.categories.some(
        (category) =>
          category.name !== oldName &&
          category.name.toLocaleLowerCase("tr-TR") ===
            cleanName.toLocaleLowerCase("tr-TR"),
      );

      if (duplicate) {
        window.alert("Bu isimde başka bir kategori var.");
        return false;
      }

      commit({
        ...current,
        categories: current.categories.map((category) =>
          category.name === oldName
            ? {
                ...category,
                name: cleanName,
                icon: icon.trim() || "📁",
              }
            : category,
        ),
        sentences: current.sentences.map((sentence) =>
          sentence.cat === oldName
            ? { ...sentence, cat: cleanName }
            : sentence,
        ),
      });

      return true;
    },
    [commit],
  );

  const deleteCategory = useCallback(
    (categoryName: string): boolean => {
      const current = appDataRef.current;

      if (current.categories.length <= 1) {
        window.alert("Son kategori silinemez.");
        return false;
      }

      if (!current.categories.some((item) => item.name === categoryName)) {
        return false;
      }

      /*
       * Yeni davranış: üst kategori silinirse o kategoriye bağlı bütün
       * cümleler de kalıcı olarak silinir. Onay CategoryManager'daki
       * profesyonel modalda alınır.
       */
      commit({
        ...current,
        categories: current.categories.filter(
          (category) => category.name !== categoryName,
        ),
        sentences: current.sentences.filter(
          (sentence) => sentence.cat !== categoryName,
        ),
      });

      return true;
    },
    [commit],
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

      if (cleanName.toLocaleLowerCase("tr-TR") === "genel") {
        window.alert(
          "“Genel” artık kullanılmıyor. Farklı bir alt kategori adı yaz.",
        );
        return false;
      }

      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );

      if (!category) {
        return false;
      }

      if (categoryHasName(category.subcats, cleanName)) {
        window.alert("Bu alt kategori zaten var.");
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

      commit({
        ...current,
        categories: current.categories.map((item) =>
          item.name === categoryName
            ? {
                ...item,
                subcats: [...item.subcats, cleanName],
                subsubcats: {
                  ...(item.subsubcats ?? {}),
                  [cleanName]: [],
                },
              }
            : item,
        ),
      });

      return true;
    },
    [commit, planLimits.maxSubcategoriesPerCategory],
  );

  const renameSubcategory = useCallback(
    (
      categoryName: string,
      oldName: string,
      newName: string,
    ): boolean => {
      const cleanName = newName.trim();
      if (!cleanName) {
        window.alert("Alt kategori adı boş bırakılamaz.");
        return false;
      }

      if (cleanName.toLocaleLowerCase("tr-TR") === "genel") {
        window.alert(
          "“Genel” artık kullanılmıyor. Farklı bir alt kategori adı yaz.",
        );
        return false;
      }

      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );

      if (!category) {
        return false;
      }

      if (categoryHasName(category.subcats, cleanName, oldName)) {
        window.alert("Bu isimde başka bir alt kategori var.");
        return false;
      }

      commit({
        ...current,
        categories: current.categories.map((item) => {
          if (item.name !== categoryName) {
            return item;
          }

          const previousChildren = item.subsubcats?.[oldName] ?? [];
          const nextSubsubcats = { ...(item.subsubcats ?? {}) };
          delete nextSubsubcats[oldName];
          nextSubsubcats[cleanName] = previousChildren;

          return {
            ...item,
            subcats: item.subcats.map((subcategory) =>
              subcategory === oldName ? cleanName : subcategory,
            ),
            subsubcats: nextSubsubcats,
          };
        }),
        sentences: current.sentences.map((sentence) =>
          sentence.cat === categoryName && sentence.subcat === oldName
            ? { ...sentence, subcat: cleanName }
            : sentence,
        ),
      });

      return true;
    },
    [commit],
  );

  const addSubsubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
      subsubcategoryName: string,
    ): boolean => {
      const cleanName = subsubcategoryName.trim();
      if (!cleanName) {
        return false;
      }

      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );

      if (!category || !category.subcats.includes(subcategoryName)) {
        return false;
      }

      const children = category.subsubcats?.[subcategoryName] ?? [];

      if (categoryHasName(children, cleanName)) {
        window.alert("Bu alt-alt kategori zaten var.");
        return false;
      }

      if (
        hasReachedLimit(
          children.length,
          planLimits.maxSubcategoriesPerCategory,
        )
      ) {
        window.alert(
          `Free planda bir alt kategoride en fazla ${planLimits.maxSubcategoriesPerCategory} alt-alt kategori oluşturabilirsin.`,
        );
        return false;
      }

      commit({
        ...current,
        categories: current.categories.map((item) =>
          item.name === categoryName
            ? {
                ...item,
                subsubcats: {
                  ...(item.subsubcats ?? {}),
                  [subcategoryName]: [...children, cleanName],
                },
              }
            : item,
        ),
      });

      return true;
    },
    [commit, planLimits.maxSubcategoriesPerCategory],
  );

  const renameSubsubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
      oldName: string,
      newName: string,
    ): boolean => {
      const cleanName = newName.trim();
      if (!cleanName) {
        return false;
      }

      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );
      const children = category?.subsubcats?.[subcategoryName] ?? [];

      if (!category || !children.includes(oldName)) {
        return false;
      }

      if (categoryHasName(children, cleanName, oldName)) {
        window.alert("Bu isimde başka bir alt-alt kategori var.");
        return false;
      }

      commit({
        ...current,
        categories: current.categories.map((item) =>
          item.name === categoryName
            ? {
                ...item,
                subsubcats: {
                  ...(item.subsubcats ?? {}),
                  [subcategoryName]: children.map((name) =>
                    name === oldName ? cleanName : name,
                  ),
                },
              }
            : item,
        ),
        sentences: current.sentences.map((sentence) =>
          sentence.cat === categoryName &&
          sentence.subcat === subcategoryName &&
          sentence.subsubcat === oldName
            ? { ...sentence, subsubcat: cleanName }
            : sentence,
        ),
      });

      return true;
    },
    [commit],
  );

  const deleteSubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
      options: DeleteGroupOptions = { sentenceAction: "delete" },
    ): boolean => {
      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );

      if (!category || !category.subcats.includes(subcategoryName)) {
        return false;
      }

      let nextSentences = current.sentences;

      if (options.sentenceAction === "move") {
        if (!options.target) {
          return false;
        }

        const target = getDestination(options.target);
        if (!isValidDestination(current, target)) {
          window.alert("Taşınacak hedef kategori yolu artık mevcut değil.");
          return false;
        }

        if (
          target.category === categoryName &&
          target.subcategory === subcategoryName
        ) {
          window.alert("Silinen alt kategorinin içine taşıma yapılamaz.");
          return false;
        }

        nextSentences = current.sentences.map((sentence) =>
          sentence.cat === categoryName &&
          sentence.subcat === subcategoryName
            ? {
                ...sentence,
                cat: target.category,
                subcat: target.subcategory,
                subsubcat: target.subsubcategory,
              }
            : sentence,
        );
      } else {
        nextSentences = current.sentences.filter(
          (sentence) =>
            !(
              sentence.cat === categoryName &&
              sentence.subcat === subcategoryName
            ),
        );
      }

      commit({
        ...current,
        categories: current.categories.map((item) => {
          if (item.name !== categoryName) {
            return item;
          }

          const nextSubsubcats = { ...(item.subsubcats ?? {}) };
          delete nextSubsubcats[subcategoryName];

          return {
            ...item,
            subcats: item.subcats.filter(
              (subcategory) => subcategory !== subcategoryName,
            ),
            subsubcats: nextSubsubcats,
          };
        }),
        sentences: nextSentences,
      });

      return true;
    },
    [commit],
  );

  const deleteSubsubcategory = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
      subsubcategoryName: string,
      options: DeleteGroupOptions = { sentenceAction: "delete" },
    ): boolean => {
      const current = appDataRef.current;
      const category = current.categories.find(
        (item) => item.name === categoryName,
      );
      const children = category?.subsubcats?.[subcategoryName] ?? [];

      if (!category || !children.includes(subsubcategoryName)) {
        return false;
      }

      let nextSentences = current.sentences;

      if (options.sentenceAction === "move") {
        if (!options.target) {
          return false;
        }

        const target = getDestination(options.target);
        if (!isValidDestination(current, target)) {
          window.alert("Taşınacak hedef kategori yolu artık mevcut değil.");
          return false;
        }

        if (
          target.category === categoryName &&
          target.subcategory === subcategoryName &&
          target.subsubcategory === subsubcategoryName
        ) {
          return false;
        }

        nextSentences = current.sentences.map((sentence) =>
          sentence.cat === categoryName &&
          sentence.subcat === subcategoryName &&
          sentence.subsubcat === subsubcategoryName
            ? {
                ...sentence,
                cat: target.category,
                subcat: target.subcategory,
                subsubcat: target.subsubcategory,
              }
            : sentence,
        );
      } else {
        nextSentences = current.sentences.filter(
          (sentence) =>
            !(
              sentence.cat === categoryName &&
              sentence.subcat === subcategoryName &&
              sentence.subsubcat === subsubcategoryName
            ),
        );
      }

      commit({
        ...current,
        categories: current.categories.map((item) =>
          item.name === categoryName
            ? {
                ...item,
                subsubcats: {
                  ...(item.subsubcats ?? {}),
                  [subcategoryName]: children.filter(
                    (name) => name !== subsubcategoryName,
                  ),
                },
              }
            : item,
        ),
        sentences: nextSentences,
      });

      return true;
    },
    [commit],
  );

  const moveSubcategories = useCallback(
    (
      sourceCategoryName: string,
      subcategoryNames: string[],
      targetCategoryName: string,
    ): boolean => {
      if (
        !sourceCategoryName ||
        !targetCategoryName ||
        sourceCategoryName === targetCategoryName ||
        subcategoryNames.length === 0
      ) {
        return false;
      }

      const current = appDataRef.current;
      const source = current.categories.find(
        (item) => item.name === sourceCategoryName,
      );
      const target = current.categories.find(
        (item) => item.name === targetCategoryName,
      );

      if (!source || !target) {
        return false;
      }

      const selected = Array.from(new Set(subcategoryNames)).filter(
        (name) => source.subcats.includes(name),
      );

      if (selected.length === 0) {
        return false;
      }

      if (
        Number.isFinite(planLimits.maxSubcategoriesPerCategory) &&
        target.subcats.length + selected.length >
          planLimits.maxSubcategoriesPerCategory
      ) {
        window.alert(
          `Hedef kategoride Free plan alt kategori sınırı aşılır. En fazla ${planLimits.maxSubcategoriesPerCategory} alt kategori olabilir.`,
        );
        return false;
      }

      const hasConflict = selected.some((name) =>
        categoryHasName(target.subcats, name),
      );

      if (hasConflict) {
        window.alert(
          "Hedef kategoride aynı isimde bir alt kategori var. Önce isimleri düzenlemelisin.",
        );
        return false;
      }

      const movedChildren: Record<string, string[]> = {};
      selected.forEach((name) => {
        movedChildren[name] = [
          ...(source.subsubcats?.[name] ?? []),
        ];
      });

      commit({
        ...current,
        categories: current.categories.map((item) => {
          if (item.name === sourceCategoryName) {
            const nextSubsubcats = { ...(item.subsubcats ?? {}) };
            selected.forEach((name) => delete nextSubsubcats[name]);

            return {
              ...item,
              subcats: item.subcats.filter(
                (name) => !selected.includes(name),
              ),
              subsubcats: nextSubsubcats,
            };
          }

          if (item.name === targetCategoryName) {
            return {
              ...item,
              subcats: [...item.subcats, ...selected],
              subsubcats: {
                ...(item.subsubcats ?? {}),
                ...movedChildren,
              },
            };
          }

          return item;
        }),
        sentences: current.sentences.map((sentence) =>
          sentence.cat === sourceCategoryName &&
          selected.includes(sentence.subcat)
            ? { ...sentence, cat: targetCategoryName }
            : sentence,
        ),
      });

      return true;
    },
    [commit, planLimits.maxSubcategoriesPerCategory],
  );

  const resetStudyProgress = useCallback(() => {
    const approved = window.confirm(
      "Tüm çalışma ilerlemesi sıfırlanacak.\n\nCümleler ve kategoriler silinmeyecek. Devam edilsin mi?",
    );

    if (!approved) {
      return;
    }

    const current = appDataRef.current;
    commit({
      ...current,
      sentences: current.sentences.map((sentence) => ({
        ...sentence,
        srs: createNewSrs(),
      })),
      stats: {
        streak: 0,
        lastStudyDay: null,
        days: {},
        notifyEnabled: current.stats.notifyEnabled ?? false,
      },
    });

    window.alert(
      "Çalışma ilerlemesi sıfırlandı. Cümleler ve kategoriler korundu.",
    );
  }, [commit]);

  const resetCategorySrs = useCallback(
    (categoryName: string) => {
      const current = appDataRef.current;
      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          sentence.cat === categoryName
            ? { ...sentence, srs: createNewSrs() }
            : sentence,
        ),
      });
    },
    [commit],
  );

  const resetSubcategorySrs = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
    ) => {
      const current = appDataRef.current;
      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          sentence.cat === categoryName &&
          sentence.subcat === subcategoryName
            ? { ...sentence, srs: createNewSrs() }
            : sentence,
        ),
      });
    },
    [commit],
  );

  const resetSubsubcategorySrs = useCallback(
    (
      categoryName: string,
      subcategoryName: string,
      subsubcategoryName: string,
    ) => {
      const current = appDataRef.current;
      commit({
        ...current,
        sentences: current.sentences.map((sentence) =>
          sentence.cat === categoryName &&
          sentence.subcat === subcategoryName &&
          sentence.subsubcat === subsubcategoryName
            ? { ...sentence, srs: createNewSrs() }
            : sentence,
        ),
      });
    },
    [commit],
  );

  const replaceAppData = useCallback(
    (newData: AppData) => {
      commit(repairAppData(newData));
    },
    [commit],
  );

  const clearLocalData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Yerel veriler temizlenemedi:", error);
    }

    commit(cloneDefaultData());
  }, [commit]);

  const totalDue = useMemo(() => {
    const now = Date.now();

    return appData.sentences.filter(
      (sentence) =>
        sentence.srs.reps === 0 || sentence.srs.due <= now,
    ).length;
  }, [appData.sentences]);

  return {
    appData,
    isLoaded,
    addSentence,
    resetStudyProgress,
    resetCategorySrs,
    resetSubcategorySrs,
    resetSubsubcategorySrs,
    updateSentence,
    deleteSentence,
    deleteSentences,
    moveSentences,
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    addSubsubcategory,
    renameSubsubcategory,
    deleteSubsubcategory,
    moveSubcategories,
    replaceAppData,
    clearLocalData,
    totalDue,
    planLimits,
    accessLevel,
  };
}
