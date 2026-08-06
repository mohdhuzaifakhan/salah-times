/**
 * Fuzzy & Phonetic search utilities for error-tolerant text matching.
 */

// Simple Levenshtein distance calculation for typo tolerance
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalizes text by removing diacritics, extra punctuation, and standardizing common phonetic variations.
 */
export function normalizeSearchTerm(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ");
}

/**
 * Checks if a search query fuzzy matches a target text.
 */
export function fuzzyMatch(targetText: string, queryText: string): boolean {
  const normTarget = normalizeSearchTerm(targetText);
  const normQuery = normalizeSearchTerm(queryText);

  if (!normQuery) return true;
  if (!normTarget) return false;

  // Direct substring match
  if (normTarget.includes(normQuery)) return true;

  // Check word-by-word token matching
  const targetWords = normTarget.split(" ");
  const queryWords = normQuery.split(" ");

  // Every word in the query must match at least one target word (either substring or fuzzy)
  return queryWords.every((qWord) => {
    if (qWord.length <= 2) {
      // Short words must match exactly or as substring
      return targetWords.some((tWord) => tWord.includes(qWord));
    }

    return targetWords.some((tWord) => {
      // Direct substring
      if (tWord.includes(qWord) || qWord.includes(tWord)) return true;

      // Allow 1-2 edit distance based on word length
      const maxDistance = qWord.length > 5 ? 2 : 1;
      const distance = levenshteinDistance(qWord, tWord);
      return distance <= maxDistance;
    });
  });
}

/**
 * Helper to filter masjids list with fuzzy search against name, area, city, and state.
 */
export function fuzzyFilterMasjids<T extends { name: string; city: string; address?: string; state?: string }>(
  masjids: T[],
  query: string
): T[] {
  if (!query || !query.trim()) return masjids;

  return masjids.filter((masjid) => {
    const combinedString = `${masjid.name} ${masjid.address || ""} ${masjid.city} ${masjid.state || ""}`;
    return fuzzyMatch(combinedString, query);
  });
}
