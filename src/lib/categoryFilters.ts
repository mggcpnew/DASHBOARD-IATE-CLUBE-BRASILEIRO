// Patterns to exclude from category counts and visualizations
export const EXCLUDED_CATEGORY_PATTERNS = [
  "MESES",
  "RECEITAS DE APLICAÇÕES",
  "RECEITAS APLICAÇÕ",
  "RECEITAS APLICAÇO",
  "RECEITAS DE APLICAÇÕ",
  "DESPESAS DE APLICAÇÕES",
  "DESPESAS APLICAÇÕ",
  "DESPESAS APLICAÇO",
  "TOTAL DE RECEITAS",
  "TOTAL DE DESPESAS",
  "TOTAL RECEITAS",
  "TOTAL DESPESAS",
];

export interface CategoryLike {
  label: string;
  key?: string;
  type?: string;
}

/**
 * Filter out categories that match excluded patterns
 */
export function filterExcludedCategories<T extends CategoryLike>(categories: T[]): T[] {
  return categories.filter(
    (cat) =>
      !EXCLUDED_CATEGORY_PATTERNS.some((excluded) =>
        cat.label.toUpperCase().includes(excluded.toUpperCase())
      )
  );
}

/**
 * Get count of categories excluding the filtered ones
 */
export function getFilteredCategoryCount(categories: CategoryLike[]): number {
  return filterExcludedCategories(categories).length;
}
