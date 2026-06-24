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
  possibleDisplayName?: string;
  possibleDisplayNameZh?: string;
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
  org: "organic",
  frzn: "frozen",
  frozen: "frozen",
  bnls: "boneless",
  sknls: "skinless",
  wt: "weight",
  lb: "pound",
  lbs: "pound",
  ct: "count",
  pk: "pack",
  ea: "each",
  jmbo: "jumbo",
  chk: "chicken",
  chkn: "chicken",
  brst: "breast",
  thgh: "thigh",
  grnd: "ground",
  bf: "beef",
  prk: "pork",
  slmn: "salmon",
  shrmp: "shrimp",
  egg: "egg",
  mlk: "milk",
  ygrt: "yogurt",
  ygt: "yogurt",
  ygr: "yogurt",
  grk: "greek",
  tom: "tomato",
  broc: "broccoli",
  let: "lettuce",
  spin: "spinach",
  mushrm: "mushroom",
  pot: "potato",
  on: "onion",
  scall: "scallion",
  cilan: "cilantro",
  avo: "avocado",
  sds: "seeds",
  sf: "sunflower",
  sfd: "sunflower",
  rnch: "ranch",
  chps: "chips",
  crkr: "crackers",
  brd: "bread",
  bagl: "bagel",
  cereal: "cereal",
  psta: "pasta",
  rice: "rice",
  nood: "noodles",
  bv: "store brand"
};

const NOISE_TOKENS = new Set([
  "subtotal",
  "total",
  "tax",
  "change",
  "balance",
  "visa",
  "mastercard",
  "master",
  "cashback",
  "coupon",
  "reward",
  "member",
  "phone",
  "transaction",
  "date",
  "time",
  "id",
  "store",
  "address",
  "card",
  "debit",
  "credit"
]);

const CANONICAL_ENTRIES: CanonicalEntry[] = [
  {
    phrase: "organic broccoli florets",
    aliases: ["org broc floret", "org broc florets", "organic broccoli", "broccoli florets"],
    displayName: "Organic Broccoli Florets",
    displayNameZh: "有机西兰花",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "ranch sunflower seeds",
    aliases: ["jmbo rnch sf sds", "bv jmbo rnch sf sds", "sf sds", "jumbo ranch sunflower seeds", "sunflower seeds ranch"],
    displayName: "Ranch Sunflower Seeds",
    displayNameZh: "牧场味葵花籽",
    category: ItemCategory.SNACKS
  },
  {
    phrase: "boneless skinless chicken breast",
    aliases: ["bnls sknls chkn brst", "boneless chicken breast", "chicken breast"],
    displayName: "Chicken Breast",
    displayNameZh: "鸡胸肉",
    category: ItemCategory.MEAT
  },
  {
    phrase: "chicken thigh",
    aliases: ["chkn thgh", "chicken thighs"],
    displayName: "Chicken Thigh",
    displayNameZh: "鸡腿肉",
    category: ItemCategory.MEAT
  },
  {
    phrase: "ground beef",
    aliases: ["grnd bf", "ground bf"],
    displayName: "Ground Beef",
    displayNameZh: "牛绞肉",
    category: ItemCategory.MEAT
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
    phrase: "broccoli",
    aliases: ["broc", "broccoli florets"],
    displayName: "Broccoli",
    displayNameZh: "西兰花",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "lettuce",
    aliases: ["let", "romaine lettuce"],
    displayName: "Lettuce",
    displayNameZh: "生菜",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "spinach",
    aliases: ["spin", "baby spinach"],
    displayName: "Spinach",
    displayNameZh: "菠菜",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "mushroom",
    aliases: ["mushrm", "mushrm"],
    displayName: "Mushroom",
    displayNameZh: "蘑菇",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "potato",
    aliases: ["pot", "russet potato"],
    displayName: "Potato",
    displayNameZh: "土豆",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "onion",
    aliases: ["on", "yellow onion"],
    displayName: "Onion",
    displayNameZh: "洋葱",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "scallion",
    aliases: ["scall", "green onion"],
    displayName: "Scallion",
    displayNameZh: "葱",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "cilantro",
    aliases: ["cilan", "coriander leaf"],
    displayName: "Cilantro",
    displayNameZh: "香菜",
    category: ItemCategory.VEGETABLES
  },
  {
    phrase: "avocado",
    aliases: ["avo"],
    displayName: "Avocado",
    displayNameZh: "牛油果",
    category: ItemCategory.FRUITS
  },
  {
    phrase: "pasta",
    aliases: ["psta"],
    displayName: "Pasta",
    displayNameZh: "意面",
    category: ItemCategory.GRAINS
  },
  {
    phrase: "noodles",
    aliases: ["nood"],
    displayName: "Noodles",
    displayNameZh: "面条",
    category: ItemCategory.GRAINS
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
    aliases: ["mlk", "whole milk", "milk"],
    displayName: "Milk",
    displayNameZh: "牛奶",
    category: ItemCategory.DAIRY
  },
  {
    phrase: "salmon",
    aliases: ["slmn", "salmon"],
    displayName: "Salmon",
    displayNameZh: "三文鱼",
    category: ItemCategory.SEAFOOD
  },
  {
    phrase: "shrimp",
    aliases: ["shrmp", "shrimp"],
    displayName: "Shrimp",
    displayNameZh: "虾",
    category: ItemCategory.SEAFOOD
  },
  {
    phrase: "bread",
    aliases: ["brd"],
    displayName: "Bread",
    displayNameZh: "面包",
    category: ItemCategory.GRAINS
  },
  {
    phrase: "chips",
    aliases: ["chps", "potato chips"],
    displayName: "Chips",
    displayNameZh: "薯片",
    category: ItemCategory.SNACKS
  },
  {
    phrase: "crackers",
    aliases: ["crkr", "cracker"],
    displayName: "Crackers",
    displayNameZh: "饼干",
    category: ItemCategory.SNACKS
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
  if (value.includes(" chicken") || value.includes(" beef") || value.includes(" pork") || value.includes(" turkey")) {
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
  if (value.includes(" rice") || value.includes(" oat") || value.includes(" flour") || value.includes(" noodle") || value.includes(" pasta")) {
    return ItemCategory.GRAINS;
  }
  if (value.includes(" seed") || value.includes(" chips") || value.includes(" crackers")) {
    return ItemCategory.SNACKS;
  }

  return ItemCategory.OTHER;
}

const WORD_TO_ZH: Record<string, string> = {
  organic: "有机",
  frozen: "冷冻",
  boneless: "去骨",
  skinless: "去皮",
  chicken: "鸡肉",
  breast: "鸡胸肉",
  beef: "牛肉",
  pork: "猪肉",
  salmon: "三文鱼",
  shrimp: "虾",
  yogurt: "酸奶",
  greek: "希腊",
  tomato: "番茄",
  roma: "罗马",
  broccoli: "西兰花",
  florets: "小朵",
  sunflower: "葵花",
  seeds: "籽",
  ranch: "牧场味",
  egg: "鸡蛋",
  eggs: "鸡蛋",
  milk: "牛奶",
  scallion: "葱",
  onion: "洋葱",
  tofu: "豆腐",
  noodle: "面条",
  noodles: "面条",
  rice: "米饭",
  potato: "土豆"
};

function toChineseCandidate(tokens: string[]) {
  const translated = tokens
    .map((token) => WORD_TO_ZH[token])
    .filter((part): part is string => Boolean(part));

  if (translated.length === 0) {
    return "";
  }

  const phrase = translated.join("");
  return phrase.length > 20 ? `${phrase.slice(0, 20)}...` : phrase;
}

function cleanRawText(rawName: string) {
  return rawName
    .replace(/[\$]?\d+[.,]\d{2}\b/g, " ")
    .replace(/\b\d{1,4}[xX]\b/g, " ")
    .replace(/\b\d{1,4}\b/g, " ")
    .replace(/[^A-Za-z\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function tokenizeAndExpand(raw: string) {
  return normalizeFoodName(raw)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !NOISE_TOKENS.has(token))
    .map((token) => {
      if (TOKEN_ALIASES[token]) {
        return TOKEN_ALIASES[token];
      }

      const nearestAlias = Object.keys(TOKEN_ALIASES).find((alias) => fuzzySimilarity(alias, token) >= 0.84);
      return nearestAlias ? TOKEN_ALIASES[nearestAlias] : token;
    });
}

export function normalizeReceiptItemName(rawName: string, learningStore: GroceryLearningStore = {}): NormalizedReceiptItem {
  const raw = rawName.trim();
  const cleaned = cleanRawText(raw);
  const normalizedRaw = normalizeFoodName(cleaned || raw);

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

  const expandedTokens = tokenizeAndExpand(cleaned || raw);
  const normalizedName = normalizeFoodName(expandedTokens.join(" "));
  const chineseCandidate = toChineseCandidate(expandedTokens);

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

  const fallbackDisplay = titleCase(normalizedName || normalizeFoodName(raw) || "Unknown Item");
  const displayName = bestEntry && bestScore >= 0.7 ? bestEntry.displayName : fallbackDisplay;
  const displayNameZh = bestEntry && bestScore >= 0.7 ? bestEntry.displayNameZh : chineseCandidate || fallbackDisplay;
  const category = bestEntry && bestScore >= 0.7 ? bestEntry.category : guessCategory(normalizedName);

  const tokenQualityBoost = expandedTokens.some((token) => TOKEN_ALIASES[token] || Object.values(TOKEN_ALIASES).includes(token)) ? 0.06 : 0;
  const confidence = Math.max(0.42, Math.min(0.99, 0.48 + bestScore * 0.42 + tokenQualityBoost));
  const roundedConfidence = Math.round(confidence * 100) / 100;
  const needsReview = roundedConfidence < 0.74;

  return {
    rawName: raw,
    normalizedName: normalizedName || normalizeFoodName(raw),
    displayName,
    displayNameZh,
    category,
    confidence: roundedConfidence,
    aliases: bestEntry ? [raw, ...bestEntry.aliases].slice(0, 8) : [raw],
    needsReview,
    possibleDisplayName: needsReview ? displayName : undefined,
    possibleDisplayNameZh: needsReview ? `${displayNameZh}（需要确认）` : undefined
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
