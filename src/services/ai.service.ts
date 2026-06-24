import { getExpirationBucket, isExpiringSoonBucket } from "@/utils/food";

type AssistantRecipeMatch = {
  name: string;
  matchScore: number;
  missingIngredients: string[];
  cuisine?: string;
};

export type AiMessage = {
  userPrompt: string;
  inventory: Array<{
    name: string;
    category: string;
    expirationDate: Date | null;
    quantity: number;
    unit: string;
  }>;
  shopping: Array<{ name: string; quantity: number; unit: string; isPurchased: boolean }>;
  recommendations: AssistantRecipeMatch[];
};

const CATEGORY_PROTEIN_PER_UNIT: Record<string, number> = {
  MEAT: 24,
  SEAFOOD: 21,
  EGGS: 12,
  DAIRY: 8,
  GRAINS: 4,
  VEGETABLES: 2,
  FRUITS: 1,
  FROZEN_FOODS: 6,
  CONDIMENTS: 0,
  SNACKS: 3,
  BEVERAGES: 1,
  OTHER: 5
};

function toBullet(items: string[]) {
  return items.length === 0 ? "- None" : items.map((item) => `- ${item}`).join("\n");
}

export async function getAssistantResponse(message: AiMessage) {
  const prompt = message.userPrompt.toLowerCase();
  const inventoryNames = new Set(message.inventory.map((item) => item.name.toLowerCase().trim()));
  const estimatedProtein = message.inventory.reduce((sum, item) => {
    const proteinPerUnit = CATEGORY_PROTEIN_PER_UNIT[item.category] ?? 4;
    return sum + proteinPerUnit * Number(item.quantity || 0);
  }, 0);

  const expiringItems = message.inventory
    .filter((item) => isExpiringSoonBucket(getExpirationBucket(item.expirationDate)))
    .map((item) => ({ name: item.name, bucket: getExpirationBucket(item.expirationDate) }))
    .sort((left, right) => {
      const urgency = ["expired", "today", "threeDays", "sevenDays", "safe"];
      return urgency.indexOf(left.bucket) - urgency.indexOf(right.bucket);
    });

  if (prompt.includes("expir")) {
    if (expiringItems.length === 0) {
      return { text: "Nothing in your inventory is currently flagged as expiring soon." };
    }

    return {
      text: `These items need attention soon:\n${expiringItems
        .map((item) => `- ${item.name} (${item.bucket === "today" ? "expires today" : item.bucket.replace(/([A-Z])/g, " $1").toLowerCase()})`)
        .join("\n")}`
    };
  }

  if ((prompt.includes("costco") && prompt.includes("shopping")) || prompt.includes("shopping list")) {
    const suggested = ["Eggs", "Milk", "Chicken breast", "Greek yogurt", "Spinach", "Rice"]
      .filter((item) => !inventoryNames.has(item.toLowerCase()))
      .slice(0, 8);

    const pendingShopping = message.shopping.filter((item) => !item.isPurchased).slice(0, 5);

    return {
      text: `Costco-ready shopping suggestions based on your current inventory:\n${toBullet(suggested)}\n\nCurrent unpurchased shopping items:\n${toBullet(pendingShopping.map((item) => `${item.name} (${item.quantity} ${item.unit})`))}`
    };
  }

  if (prompt.includes("180g") || (prompt.includes("protein") && prompt.includes("tomorrow"))) {
    const delta = Math.max(0, 180 - Math.round(estimatedProtein));
    const suggestedProtein = ["Chicken breast", "Salmon", "Greek yogurt", "Eggs", "Tofu"]
      .filter((item) => !inventoryNames.has(item.toLowerCase()))
      .slice(0, 5);

    return {
      text: `Estimated available protein today: ${Math.round(estimatedProtein)} g.\nGap to 180 g target: ${delta} g.\n\nTo close the gap tomorrow, add:\n${toBullet(suggestedProtein)}`
    };
  }

  if (prompt.includes("chinese") || prompt.includes("japanese") || prompt.includes("korean") || prompt.includes("american") || prompt.includes("mediterranean")) {
    const cuisine = ["chinese", "japanese", "korean", "american", "mediterranean"].find((item) => prompt.includes(item));
    const matches = message.recommendations.filter((recipe) => recipe.cuisine?.toLowerCase().includes(cuisine ?? ""));
    const top = matches.filter((recipe) => recipe.matchScore > 0).slice(0, 4);

    if (top.length === 0) {
      return {
        text: `I do not have a strong ${cuisine ?? "requested"} dish match from your current inventory yet. Add proteins + vegetables to unlock better options.`
      };
    }

    return {
      text: `Best ${cuisine} dishes for your current ingredients:\n${top
        .map((recipe) => `- ${recipe.name} (${recipe.matchScore}% match${recipe.missingIngredients.length ? `, missing: ${recipe.missingIngredients.join(", ")}` : ""})`)
        .join("\n")}`
    };
  }

  if (prompt.includes("cook tonight") || prompt.includes("cook")) {
    const topMatches = message.recommendations.filter((recipe) => recipe.matchScore > 0).slice(0, 3);

    if (topMatches.length === 0) {
      return {
        text: "Your inventory is light right now. Add a few proteins, vegetables, and grains to unlock better meal suggestions."
      };
    }

    return {
      text: `Tonight you could make:\n${topMatches
        .map((recipe) => `- ${recipe.name} (${recipe.matchScore}% match${recipe.missingIngredients.length ? `, missing: ${recipe.missingIngredients.join(", ")}` : ""})`)
        .join("\n")}`
    };
  }

  return {
    text: `I can help plan meals, flag expiring food, and build shopping lists from your real inventory. Current inventory highlights: ${message.inventory
      .slice(0, 5)
      .map((item) => item.name)
      .join(", ") || "no foods added yet"}.`
  };
}
