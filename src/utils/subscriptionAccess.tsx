export const FEATURE_ACCESS: { [feature: string]: Array<"basic" | "premium"> } = {
  "Market Prices": ["basic", "premium"],
  "Learn to Grow": ["basic", "premium"],
  "Smart Crop Calendar": ["basic", "premium"],
  "Profit Calculator": ["basic", "premium"],
  "Subsidies, Grants & Loans": ["basic", "premium"],
  "Agritech News": ["basic", "premium"],
  "Forum": ["basic", "premium"],
  "Livestock Management": ["premium"],
  "Poultry Management": ["premium"],
  "Satellite Imaging & AI Insights": ["premium"]
};

export function canAccessFeature(plan: string, feature: string): boolean {
  return FEATURE_ACCESS[feature]?.includes(plan as "basic" | "premium");
}