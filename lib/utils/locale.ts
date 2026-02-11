/**
 * Get localized name from a JSON multi-language field.
 * Falls back to English, then first available language.
 */
export function getLocalizedName(
  nameJson: unknown,
  locale: string
): string {
  if (!nameJson || typeof nameJson !== "object") {
    return String(nameJson || "");
  }
  const names = nameJson as Record<string, string>;
  return names[locale] || names["en"] || Object.values(names)[0] || "";
}

/**
 * Search multi-language JSON fields for a query string.
 */
export function searchMultiLang(
  nameJson: unknown,
  query: string
): boolean {
  if (!nameJson || typeof nameJson !== "object") {
    return String(nameJson || "").toLowerCase().includes(query);
  }
  const names = nameJson as Record<string, string>;
  return Object.values(names).some((v) =>
    v?.toLowerCase().includes(query)
  );
}
