import { scoreItem } from './score.ts';
import { DEFAULT_MINIMUM_MATCH } from '../constants.ts';
import { ActionItem } from '../types.ts';

/**
 * Scores actions based on a given pattern.
 *
 * @param {Array} items - The array of items to be scored.
 * @param {string} pattern - The pattern to be used for scoring.
 * @returns {Array} - The array of scored items.
 */
// Nudge already-open tabs above equally-matching bookmarks — switching to a
// live tab beats opening a duplicate. Small enough that a clearly better
// bookmark match still wins.
const SOURCE_BOOST: Record<string, number> = { tab: 1.1 };

// Keep matches scoring at least this fraction of the best hit. The scorer
// lumps strong acronym matches and scattered junk into the same low band, so a
// fixed floor would cut useful matches; a cutoff relative to the top result
// prunes noise when a clear winner exists yet keeps results when the whole list
// is only loosely matched (e.g. mid-typing).
const RELATIVE_MATCH_RATIO = 0.3;

export default function scoreActions(
  items: ActionItem[],
  pattern: string,
): ActionItem[] {
  if (!items?.length) return [];
  if (!pattern || pattern.length < DEFAULT_MINIMUM_MATCH) return items;

  const scored = items
    .map((item) => {
      const base = Math.max(
        scoreItem(item.title, pattern),
        item.domain ? scoreItem(item.domain, pattern) : 0,
        item.path ? scoreItem(item.path, pattern) : 0
      );
      return { ...item, score: base * (SOURCE_BOOST[item.source ?? ""] ?? 1) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return scored;

  // scored is sorted desc, so scored[0] is the best match.
  const cutoff = scored[0].score * RELATIVE_MATCH_RATIO;
  return scored.filter((item) => item.score >= cutoff);
}
