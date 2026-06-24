import type { RecipeDifficulty } from "@prisma/client";
import { normalizeFoodName } from "@/utils/food";

export type BuiltInRecipeLibraryEntry = {
  id: string;
  titleEn: string;
  titleZh: string;
  cuisine: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  cookTime: number;
  difficulty: RecipeDifficulty;
  ingredients: string[];
  optionalIngredients: string[];
  steps: string[];
  tags: string[];
  proteinType: "chicken" | "beef" | "pork" | "seafood" | "tofu" | "egg" | "plant" | "mixed";
  estimatedNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  commonSubstitutions: Array<{ from: string; to: string }>;
};

function entry(index: number, value: Omit<BuiltInRecipeLibraryEntry, "id">): BuiltInRecipeLibraryEntry {
  return {
    id: `builtin-${String(index).padStart(3, "0")}`,
    ...value
  };
}

export const BUILT_IN_RECIPE_LIBRARY: BuiltInRecipeLibraryEntry[] = [
  entry(1, {
    titleEn: "Tomato Egg Stir-Fry",
    titleZh: "番茄炒蛋",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 15,
    difficulty: "EASY",
    ingredients: ["tomato", "egg", "scallion", "oil"],
    optionalIngredients: ["ketchup"],
    steps: ["Beat eggs", "Stir-fry tomato", "Add egg and finish"],
    tags: ["home-style", "quick"],
    proteinType: "egg",
    estimatedNutrition: { calories: 300, protein: 16, carbs: 10, fat: 20 },
    commonSubstitutions: [{ from: "scallion", to: "onion" }]
  }),
  entry(2, {
    titleEn: "Braised Beef with Tomato",
    titleZh: "西红柿牛腩",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 55,
    difficulty: "MEDIUM",
    ingredients: ["beef", "tomato", "onion", "ginger"],
    optionalIngredients: ["carrot"],
    steps: ["Brown beef", "Saute aromatics", "Simmer with tomato"],
    tags: ["home-style", "high-protein"],
    proteinType: "beef",
    estimatedNutrition: { calories: 520, protein: 36, carbs: 18, fat: 32 },
    commonSubstitutions: [{ from: "beef brisket", to: "beef chuck" }]
  }),
  entry(3, {
    titleEn: "Shredded Pork with Green Pepper",
    titleZh: "青椒肉丝",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 20,
    difficulty: "EASY",
    ingredients: ["pork", "green pepper", "soy sauce", "garlic"],
    optionalIngredients: ["onion"],
    steps: ["Marinate pork", "Stir-fry pork", "Add green pepper"],
    tags: ["quick", "home-style"],
    proteinType: "pork",
    commonSubstitutions: [{ from: "pork", to: "chicken" }]
  }),
  entry(4, {
    titleEn: "Beef and Potato Stew",
    titleZh: "土豆炖牛肉",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 60,
    difficulty: "MEDIUM",
    ingredients: ["beef", "potato", "carrot", "onion"],
    optionalIngredients: ["star anise"],
    steps: ["Brown beef", "Add vegetables", "Stew until tender"],
    tags: ["home-style"],
    proteinType: "beef",
    commonSubstitutions: [{ from: "potato", to: "sweet potato" }]
  }),
  entry(5, {
    titleEn: "Kung Pao Chicken",
    titleZh: "宫保鸡丁",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 25,
    difficulty: "MEDIUM",
    ingredients: ["chicken", "peanut", "dried chili", "scallion"],
    optionalIngredients: ["cucumber"],
    steps: ["Marinate chicken", "Make sauce", "Quick stir-fry"],
    tags: ["home-style", "high-protein"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "peanut", to: "cashew" }]
  }),
  entry(6, {
    titleEn: "Fish-Fragrant Shredded Pork",
    titleZh: "鱼香肉丝",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 25,
    difficulty: "MEDIUM",
    ingredients: ["pork", "carrot", "wood ear mushroom", "vinegar"],
    optionalIngredients: ["bamboo shoot"],
    steps: ["Prepare sauce", "Stir-fry pork", "Add vegetables"],
    tags: ["home-style"],
    proteinType: "pork",
    commonSubstitutions: [{ from: "wood ear mushroom", to: "shiitake" }]
  }),
  entry(7, {
    titleEn: "Mapo Tofu",
    titleZh: "麻婆豆腐",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 18,
    difficulty: "EASY",
    ingredients: ["tofu", "ground pork", "doubanjiang", "scallion"],
    optionalIngredients: ["sichuan pepper"],
    steps: ["Cook pork", "Add sauce", "Simmer tofu"],
    tags: ["quick", "home-style"],
    proteinType: "tofu",
    commonSubstitutions: [{ from: "ground pork", to: "ground turkey" }]
  }),
  entry(8, {
    titleEn: "Garlic Broccoli",
    titleZh: "蒜蓉西兰花",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 12,
    difficulty: "EASY",
    ingredients: ["broccoli", "garlic", "oil", "salt"],
    optionalIngredients: ["oyster sauce"],
    steps: ["Blanch broccoli", "Saute garlic", "Toss together"],
    tags: ["quick", "light"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "broccoli", to: "cauliflower" }]
  }),
  entry(9, {
    titleEn: "Oyster Sauce Lettuce",
    titleZh: "蚝油生菜",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 10,
    difficulty: "EASY",
    ingredients: ["lettuce", "oyster sauce", "garlic"],
    optionalIngredients: ["sesame oil"],
    steps: ["Blanch lettuce", "Warm sauce", "Plate and pour"],
    tags: ["quick", "light"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "lettuce", to: "bok choy" }]
  }),
  entry(10, {
    titleEn: "Egg Fried Rice",
    titleZh: "鸡蛋炒饭",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 15,
    difficulty: "EASY",
    ingredients: ["rice", "egg", "scallion", "soy sauce"],
    optionalIngredients: ["ham", "peas"],
    steps: ["Scramble egg", "Fry rice", "Season and finish"],
    tags: ["quick", "home-style"],
    proteinType: "egg",
    commonSubstitutions: [{ from: "rice", to: "cauliflower rice" }]
  }),
  entry(11, {
    titleEn: "Scallion Oil Noodles",
    titleZh: "葱油拌面",
    cuisine: "Chinese",
    mealType: "lunch",
    cookTime: 15,
    difficulty: "EASY",
    ingredients: ["noodles", "scallion", "soy sauce", "oil"],
    optionalIngredients: ["sesame"],
    steps: ["Fry scallion", "Cook noodles", "Mix sauce"],
    tags: ["quick", "home-style"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "noodles", to: "udon" }]
  }),
  entry(12, {
    titleEn: "Braised Chicken Legs",
    titleZh: "红烧鸡腿",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 35,
    difficulty: "MEDIUM",
    ingredients: ["chicken thigh", "soy sauce", "ginger", "garlic"],
    optionalIngredients: ["potato"],
    steps: ["Brown chicken", "Add sauce", "Simmer until glossy"],
    tags: ["home-style", "high-protein"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "chicken thigh", to: "drumstick" }]
  }),
  entry(13, {
    titleEn: "Stir-Fried Baby Bok Choy",
    titleZh: "清炒小白菜",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 8,
    difficulty: "EASY",
    ingredients: ["baby bok choy", "garlic", "salt"],
    optionalIngredients: ["goji berry"],
    steps: ["Quick stir-fry", "Season", "Serve hot"],
    tags: ["quick", "light"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "baby bok choy", to: "spinach" }]
  }),
  entry(14, {
    titleEn: "Tofu Shrimp Soup",
    titleZh: "豆腐虾仁汤",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 18,
    difficulty: "EASY",
    ingredients: ["tofu", "shrimp", "ginger", "scallion"],
    optionalIngredients: ["napa cabbage"],
    steps: ["Boil broth", "Add tofu", "Add shrimp and finish"],
    tags: ["light", "high-protein"],
    proteinType: "seafood",
    commonSubstitutions: [{ from: "shrimp", to: "fish" }]
  }),
  entry(15, {
    titleEn: "Shiitake with Greens",
    titleZh: "香菇青菜",
    cuisine: "Chinese",
    mealType: "dinner",
    cookTime: 12,
    difficulty: "EASY",
    ingredients: ["shiitake", "greens", "garlic"],
    optionalIngredients: ["oyster sauce"],
    steps: ["Saute mushroom", "Add greens", "Season"],
    tags: ["quick", "light"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "shiitake", to: "button mushroom" }]
  }),
  entry(16, {
    titleEn: "Chicken Salad",
    titleZh: "鸡肉沙拉",
    cuisine: "American",
    mealType: "lunch",
    cookTime: 15,
    difficulty: "EASY",
    ingredients: ["chicken", "lettuce", "tomato", "dressing"],
    optionalIngredients: ["avocado"],
    steps: ["Slice chicken", "Assemble vegetables", "Add dressing"],
    tags: ["light", "high-protein"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "chicken", to: "turkey" }]
  }),
  entry(17, {
    titleEn: "Turkey Sandwich",
    titleZh: "火鸡三明治",
    cuisine: "American",
    mealType: "lunch",
    cookTime: 8,
    difficulty: "EASY",
    ingredients: ["turkey", "bread", "lettuce", "cheese"],
    optionalIngredients: ["tomato"],
    steps: ["Toast bread", "Layer ingredients", "Slice and serve"],
    tags: ["quick"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "turkey", to: "chicken" }]
  }),
  entry(18, {
    titleEn: "Pasta with Tomato Sauce",
    titleZh: "番茄意面",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 20,
    difficulty: "EASY",
    ingredients: ["pasta", "tomato sauce", "garlic", "olive oil"],
    optionalIngredients: ["parmesan"],
    steps: ["Cook pasta", "Warm sauce", "Combine"],
    tags: ["quick", "home-style"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "pasta", to: "whole wheat pasta" }]
  }),
  entry(19, {
    titleEn: "Chicken Broccoli Rice Bowl",
    titleZh: "鸡肉西兰花饭碗",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 25,
    difficulty: "EASY",
    ingredients: ["chicken", "broccoli", "rice"],
    optionalIngredients: ["teriyaki sauce"],
    steps: ["Cook chicken", "Steam broccoli", "Assemble bowl"],
    tags: ["high-protein"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "rice", to: "quinoa" }]
  }),
  entry(20, {
    titleEn: "Beef Tacos",
    titleZh: "牛肉塔可",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 20,
    difficulty: "EASY",
    ingredients: ["ground beef", "tortilla", "lettuce", "cheese"],
    optionalIngredients: ["salsa"],
    steps: ["Cook beef", "Warm tortilla", "Fill and serve"],
    tags: ["quick", "high-protein"],
    proteinType: "beef",
    commonSubstitutions: [{ from: "ground beef", to: "ground turkey" }]
  }),
  entry(21, {
    titleEn: "Salmon with Vegetables",
    titleZh: "三文鱼配蔬菜",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 22,
    difficulty: "EASY",
    ingredients: ["salmon", "broccoli", "carrot", "olive oil"],
    optionalIngredients: ["lemon"],
    steps: ["Season salmon", "Roast vegetables", "Bake together"],
    tags: ["high-protein", "light"],
    proteinType: "seafood",
    commonSubstitutions: [{ from: "salmon", to: "cod" }]
  }),
  entry(22, {
    titleEn: "Omelet",
    titleZh: "煎蛋卷",
    cuisine: "American",
    mealType: "breakfast",
    cookTime: 10,
    difficulty: "EASY",
    ingredients: ["egg", "milk", "cheese"],
    optionalIngredients: ["spinach", "mushroom"],
    steps: ["Beat eggs", "Cook in pan", "Fold and finish"],
    tags: ["quick", "high-protein"],
    proteinType: "egg",
    commonSubstitutions: [{ from: "milk", to: "oat milk" }]
  }),
  entry(23, {
    titleEn: "Grilled Cheese and Tomato Soup",
    titleZh: "芝士三明治配番茄汤",
    cuisine: "American",
    mealType: "lunch",
    cookTime: 20,
    difficulty: "EASY",
    ingredients: ["bread", "cheese", "tomato soup"],
    optionalIngredients: ["butter"],
    steps: ["Grill sandwich", "Warm soup", "Serve together"],
    tags: ["home-style"],
    proteinType: "mixed",
    commonSubstitutions: [{ from: "cheese", to: "mozzarella" }]
  }),
  entry(24, {
    titleEn: "Sheet Pan Chicken and Vegetables",
    titleZh: "烤盘鸡肉蔬菜",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 35,
    difficulty: "EASY",
    ingredients: ["chicken", "potato", "broccoli", "onion"],
    optionalIngredients: ["bell pepper"],
    steps: ["Chop ingredients", "Season", "Roast on one tray"],
    tags: ["high-protein"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "potato", to: "sweet potato" }]
  }),
  entry(25, {
    titleEn: "Tuna Salad",
    titleZh: "金枪鱼沙拉",
    cuisine: "American",
    mealType: "lunch",
    cookTime: 12,
    difficulty: "EASY",
    ingredients: ["tuna", "lettuce", "egg", "dressing"],
    optionalIngredients: ["corn"],
    steps: ["Mix dressing", "Add tuna", "Toss greens"],
    tags: ["quick", "high-protein"],
    proteinType: "seafood",
    commonSubstitutions: [{ from: "tuna", to: "salmon" }]
  }),
  entry(26, {
    titleEn: "Chicken Noodle Soup",
    titleZh: "鸡肉面汤",
    cuisine: "American",
    mealType: "dinner",
    cookTime: 30,
    difficulty: "EASY",
    ingredients: ["chicken", "noodle", "carrot", "celery"],
    optionalIngredients: ["parsley"],
    steps: ["Make broth", "Cook noodle", "Add chicken"],
    tags: ["light", "home-style"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "noodle", to: "rice" }]
  }),
  entry(27, {
    titleEn: "Japanese Curry",
    titleZh: "日式咖喱",
    cuisine: "Japanese",
    mealType: "dinner",
    cookTime: 40,
    difficulty: "EASY",
    ingredients: ["curry roux", "potato", "carrot", "onion", "protein"],
    optionalIngredients: ["apple"],
    steps: ["Cook protein", "Simmer vegetables", "Add roux"],
    tags: ["home-style"],
    proteinType: "mixed",
    commonSubstitutions: [{ from: "protein", to: "tofu" }]
  }),
  entry(28, {
    titleEn: "Miso Soup",
    titleZh: "味噌汤",
    cuisine: "Japanese",
    mealType: "dinner",
    cookTime: 10,
    difficulty: "EASY",
    ingredients: ["miso", "tofu", "seaweed", "scallion"],
    optionalIngredients: ["mushroom"],
    steps: ["Heat broth", "Dissolve miso", "Add tofu"],
    tags: ["quick", "light"],
    proteinType: "tofu",
    commonSubstitutions: [{ from: "tofu", to: "egg" }]
  }),
  entry(29, {
    titleEn: "Korean Bibimbap",
    titleZh: "韩式拌饭",
    cuisine: "Korean",
    mealType: "dinner",
    cookTime: 30,
    difficulty: "MEDIUM",
    ingredients: ["rice", "egg", "beef", "spinach", "carrot"],
    optionalIngredients: ["gochujang"],
    steps: ["Cook toppings", "Fry egg", "Assemble bowl"],
    tags: ["high-protein"],
    proteinType: "beef",
    commonSubstitutions: [{ from: "beef", to: "tofu" }]
  }),
  entry(30, {
    titleEn: "Fried Rice",
    titleZh: "炒饭",
    cuisine: "Global",
    mealType: "dinner",
    cookTime: 15,
    difficulty: "EASY",
    ingredients: ["rice", "egg", "mixed vegetables"],
    optionalIngredients: ["ham"],
    steps: ["Scramble egg", "Stir-fry rice", "Season"],
    tags: ["quick", "home-style"],
    proteinType: "mixed",
    commonSubstitutions: [{ from: "egg", to: "tofu" }]
  }),
  entry(31, {
    titleEn: "Stir-Fried Noodles",
    titleZh: "炒面",
    cuisine: "Global",
    mealType: "dinner",
    cookTime: 20,
    difficulty: "EASY",
    ingredients: ["noodles", "cabbage", "carrot", "soy sauce"],
    optionalIngredients: ["chicken"],
    steps: ["Cook noodles", "Stir-fry vegetables", "Combine and season"],
    tags: ["quick"],
    proteinType: "mixed",
    commonSubstitutions: [{ from: "noodles", to: "rice noodles" }]
  }),
  entry(32, {
    titleEn: "Greek Yogurt Fruit Bowl",
    titleZh: "希腊酸奶水果碗",
    cuisine: "Mediterranean",
    mealType: "breakfast",
    cookTime: 6,
    difficulty: "EASY",
    ingredients: ["greek yogurt", "fruit", "nuts"],
    optionalIngredients: ["honey"],
    steps: ["Scoop yogurt", "Add fruit", "Top nuts"],
    tags: ["quick", "light"],
    proteinType: "plant",
    commonSubstitutions: [{ from: "greek yogurt", to: "yogurt" }]
  }),
  entry(33, {
    titleEn: "Tofu Vegetable Bowl",
    titleZh: "豆腐蔬菜碗",
    cuisine: "Global",
    mealType: "lunch",
    cookTime: 18,
    difficulty: "EASY",
    ingredients: ["tofu", "broccoli", "carrot", "rice"],
    optionalIngredients: ["sesame"],
    steps: ["Pan-sear tofu", "Cook vegetables", "Build bowl"],
    tags: ["quick", "high-protein"],
    proteinType: "tofu",
    commonSubstitutions: [{ from: "tofu", to: "tempeh" }]
  }),
  entry(34, {
    titleEn: "Mediterranean Chicken Bowl",
    titleZh: "地中海鸡肉碗",
    cuisine: "Mediterranean",
    mealType: "dinner",
    cookTime: 22,
    difficulty: "EASY",
    ingredients: ["chicken", "cucumber", "tomato", "yogurt", "rice"],
    optionalIngredients: ["olive"],
    steps: ["Cook chicken", "Prep salad", "Assemble bowl"],
    tags: ["high-protein", "light"],
    proteinType: "chicken",
    commonSubstitutions: [{ from: "chicken", to: "chickpeas" }]
  })
];

const byNormalizedEnTitle = new Map(BUILT_IN_RECIPE_LIBRARY.map((item) => [normalizeFoodName(item.titleEn), item]));

export function findBuiltInRecipeByTitle(name: string) {
  return byNormalizedEnTitle.get(normalizeFoodName(name));
}

export function getBuiltInRecipeLibrary() {
  return BUILT_IN_RECIPE_LIBRARY;
}
