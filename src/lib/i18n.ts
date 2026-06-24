export type AppLanguage = "en" | "zh";

export const languageLabel: Record<AppLanguage, string> = {
  en: "English",
  zh: "中文"
};

type CopyDictionary = {
  navDashboard: string;
  navInventory: string;
  navShopping: string;
  navRecipes: string;
  navNutrition: string;
  navReceipts: string;
  navAssistant: string;
  navProfile: string;
  navScan: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  addFood: string;
  addShoppingItem: string;
  scanReceipt: string;
  askAiCooking: string;
  familyDemoMode: string;
  inventoryCount: string;
  shoppingList: string;
  expiringSoon: string;
  recommendedRecipes: string;
  nutritionSummary: string;
  inventoryAlerts: string;
  recentlyAddedFoods: string;
  topRecipeMatches: string;
  noActiveAlerts: string;
  noInventoryYet: string;
  noRecipeCatalog: string;
  viewInventory: string;
  viewAllRecipes: string;
  viewNutrition: string;
  openSection: string;
  recipesWithMatch: string;
  kcalAvailable: string;
};

const copy: Record<AppLanguage, CopyDictionary> = {
  en: {
    navDashboard: "Dashboard",
    navInventory: "Inventory",
    navShopping: "Shopping",
    navRecipes: "Recipes",
    navNutrition: "Nutrition",
    navReceipts: "Receipts",
    navAssistant: "AI/Cooking",
    navProfile: "Profile",
    navScan: "Scan",
    dashboardTitle: "Home Food OS",
    dashboardSubtitle: "Track inventory, expiring items, meals, and nutrition at a glance.",
    addFood: "Add Food",
    addShoppingItem: "Add Shopping Item",
    scanReceipt: "Scan Receipt",
    askAiCooking: "Ask AI What to Cook",
    familyDemoMode: "Family Demo Mode - shared home inventory",
    inventoryCount: "Inventory Count",
    shoppingList: "Shopping List",
    expiringSoon: "Expiring Soon",
    recommendedRecipes: "Recommended Recipes",
    nutritionSummary: "Nutrition Summary",
    inventoryAlerts: "Inventory Alerts",
    recentlyAddedFoods: "Recently Added Foods",
    topRecipeMatches: "Top Recipe Matches",
    noActiveAlerts: "No active alerts right now.",
    noInventoryYet: "No inventory yet.",
    noRecipeCatalog: "No recipe catalog available yet.",
    viewInventory: "View Inventory",
    viewAllRecipes: "View Recipes",
    viewNutrition: "View Nutrition",
    openSection: "Open",
    recipesWithMatch: "Recipes with at least one ingredient match",
    kcalAvailable: "kcal available"
  },
  zh: {
    navDashboard: "总览",
    navInventory: "库存",
    navShopping: "购物",
    navRecipes: "菜谱",
    navNutrition: "营养",
    navReceipts: "小票",
    navAssistant: "AI烹饪",
    navProfile: "我的",
    navScan: "扫描",
    dashboardTitle: "家庭食物系统",
    dashboardSubtitle: "一目了然查看库存、临期食材、做饭建议与营养情况。",
    addFood: "添加食材",
    addShoppingItem: "添加购物项",
    scanReceipt: "扫描小票",
    askAiCooking: "问AI做什么",
    familyDemoMode: "家庭演示模式 - 共享家庭库存",
    inventoryCount: "库存总数",
    shoppingList: "购物清单",
    expiringSoon: "即将过期",
    recommendedRecipes: "推荐菜谱",
    nutritionSummary: "营养汇总",
    inventoryAlerts: "库存提醒",
    recentlyAddedFoods: "最近添加",
    topRecipeMatches: "最匹配菜谱",
    noActiveAlerts: "当前没有库存提醒。",
    noInventoryYet: "还没有库存数据。",
    noRecipeCatalog: "暂无可用菜谱。",
    viewInventory: "查看库存",
    viewAllRecipes: "查看菜谱",
    viewNutrition: "查看营养",
    openSection: "打开",
    recipesWithMatch: "至少匹配一种食材的菜谱",
    kcalAvailable: "可用千卡"
  }
};

export type CopyKey = keyof CopyDictionary;

export function t(language: AppLanguage, key: CopyKey) {
  return copy[language][key] ?? copy.en[key];
}
