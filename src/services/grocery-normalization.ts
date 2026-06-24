import { ItemCategory } from "@prisma/client";
import { normalizeFoodName } from "@/utils/food";

export type NormalizedReceiptItem = {
  rawName: string;
  normalizedName: string;
  displayName: string;
  displayNameZh: string;
  category: ItemCategory;
  confidence: number;
  aliases: string[];
  needsReview: boolean;
};

export type GroceryLearningStore = Record<
  string,
  {
    normalizedName: string;
    displayName?: string;
    displayNameZh?: string;
    category?: ItemCategory;
  }
>;

type CanonicalEntry = {
  phrase: string;
  aliases: string[];
  displayName: string;
  displayNameZh: string;
  category: ItemCategory;
};

const TOKEN_ALIASES: Record<string, string> = {
  chkn: "chicken",
  chk: "chicken",
  bnls: "boneless",
  sknls: "skinless",
  brst: "breast",
  broc: "broccoli",
  floret: "florets",
  florets: "florets",
  grk: "greek",
  ygrt: "yogurt",
  ygt: "yogurt",
  tom: "tomato",
  roma: "roma",
  org: "organic"
};

const CANONICAL_ENTRIES: CanonicalEntry[] = [
  {
    phrase: "boneless skinless chicken breast",
    aliases: ["bnls sknls chkn brst", "boneless chicken breast", "chicken breast"],
    displayName: "Chicken Breast",
    displayNameZh: "鸡胸肉",
    category: ItemCategory.MEAT
  },
  {
    phrase: "organic broccoli florets",
    aliases: ["org broc floret", "broc florets", "broccoli"],
    displayName: "Broccoli",
    displayNameZh: "西兰花",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "greek yogurt",
    aliases: ["grk ygrt", "grk ygt", "greek yogurt"],
    displayName: "Greek Yogurt",
    displayNameZh: "希腊酸奶",
    category: ItemCategory.DAIRY
  },
  {
    phrase: "roma tomato",
    aliases: ["roma tom", "roma tomato", "tomato"],
    displayName: "Roma Tomato",
    displayNameZh: "罗马番茄",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "egg",
    aliases: ["eggs", "egg"],
    displayName: "Eggs",
    displayNameZh: "鸡蛋",
    category: ItemCategory.EGGS
  },
  {
    phrase: "milk",
    aliases: ["whole milk", "milk"],
    displayName: "Milk",
    displayNameZh: "牛奶",
    category: ItemCategory.DAIRY
  },
  {
    phrase: "salmon",
    aliases: ["salmon", "fish fillet"],
    displayName: "Salmon",
    displayNameZh: "三文鱼",
    category: ItemCategory.SEAFOOD
  }
];

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  const a = left.length;
  const b = right.length;
  if (a === 0) {
    return b;
  }
  if (b === 0) {
    return a;
  }

  const matrix = Array.from({ length: a + 1 }, (_, row) => {
    return Array.from({ length: b + 1 }, (_, col) => {
      if (row === 0) {
        return col;
      }
      if (col === 0) {
        return row;
      }
      return 0;
    });
  });

  for (let row = 1; row <= a; row += 1) {
    for (let col = 1; col <= b; col += 1) {
      const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost
      );
    }
  }

  return matrix[a][b];
}

function fuzzySimilarity(left: string, right: string) {
  const longestLength = Math.max(left.length, right.length, 1);
  return 1 - levenshteinDistance(left, right) / longestLength;
}

function guessCategory(normalizedName: string) {
  const value = ` ${normalizedName} `;
  if (value.includes(" chicken") || value.includes(" beef") || value.includes(" pork")) {
    return ItemCategory.MEAT;
  }
  if (value.includes(" salmon") || value.includes(" shrimp") || value.includes(" fish")) {
    return ItemCategory.SEAFOOD;
  }
  if (value.includes(" yogurt") || value.includes(" milk") || value.includes(" cheese")) {
    return ItemCategory.DAIRY;
  }
  if (value.includes(" egg")) {
    return ItemCategory.EGGS;
  }
  if (value.includes(" broccoli") || value.includes(" tomato") || value.includes(" spinach") || value.includes(" lettuce")) {
    return ItemCategory.VEGETABLES;
  }
  if (value.includes(" rice") || value.includes(" oat") || value.includes(" flour")) {
    return ItemCategory.GRAINS;
  }

  return ItemCategory.OTHER;
}

export function normalizeReceiptItemName(rawName: string, learningStore: GroceryLearningStore = {}): NormalizedReceiptItem {
  const raw = rawName.trim();
  const normalizedRaw = normalizeFoodName(raw);

  const learned = learningStore[normalizedRaw];
  if (learned) {
    const normalizedName = learned.normalizedName;
    const displayName = learned.displayName ?? titleCase(normalizedName);
    const displayNameZh = learned.displayNameZh ?? displayName;
    const category = learned.category ?? guessCategory(normalizedName);

    return {
      rawName: raw,
      normalizedName,
      displayName,
      displayNameZh,
      category,
      confidence: 0.99,
      aliases: [raw],
      needsReview: false
    };
  }

  const expandedTokens = normalizedRaw
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (TOKEN_ALIASES[token]) {
        return TOKEN_ALIASES[token];
      }

      const nearestAlias = Object.keys(TOKEN_ALIASES).find((alias) => fuzzySimilarity(alias, token) >= 0.84);
      return nearestAlias ? TOKEN_ALIASES[nearestAlias] : token;
    });

  const normalizedName = normalizeFoodName(expandedTokens.join(" "));

  let bestEntry: CanonicalEntry | null = null;
  let bestScore = 0;

  for (const entry of CANONICAL_ENTRIES) {
    const candidates = [entry.phrase, ...entry.aliases];
    for (const candidate of candidates) {
      const similarity = fuzzySimilarity(normalizedName, normalizeFoodName(candidate));
      if (similarity > bestScore) {
        bestScore = similarity;
        bestEntry = entry;
      }
    }
  }

  const displayName = bestEntry && bestScore > 0.75 ? bestEntry.displayName : titleCase(normalizedName || raw);
  const displayNameZh = bestEntry && bestScore > 0.75 ? bestEntry.displayNameZh : displayName;
  const category = bestEntry && bestScore > 0.75 ? bestEntry.category : guessCategory(normalizedName);

  const confidence = Math.max(0.45, Math.min(0.99, 0.55 + bestScore * 0.35 + (normalizedName === normalizedRaw ? 0 : 0.08)));

  return {
    rawName: raw,
    normalizedName: normalizedName || normalizeFoodName(raw),
    displayName,
    displayNameZh,
    category,
    confidence: Math.round(confidence * 100) / 100,
    aliases: bestEntry ? [raw, ...bestEntry.aliases].slice(0, 6) : [raw],
    needsReview: confidence < 0.72
  };
}

export function createLearningEntryFromCorrection(input: {
  rawName: string;
  correctedName: string;
  correctedCategory?: ItemCategory;
  correctedDisplayNameZh?: string;
}) {
  const raw = normalizeFoodName(input.rawName);
  const normalized = normalizeFoodName(input.correctedName);

  return {
    [raw]: {
      normalizedName: normalized,
      displayName: titleCase(normalized),
      displayNameZh: input.correctedDisplayNameZh,
      category: input.correctedCategory
    }
  } as GroceryLearningStore;
}

export function mergeLearningStore(current: GroceryLearningStore, nextEntry: GroceryLearningStore) {
  return {
    ...current,
    ...nextEntry
  };
}
