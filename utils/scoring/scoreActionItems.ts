import { scoreItem } from './score.ts';
import { DEFAULT_MINIMUM_MATCH } from '../constants.ts';
import { ActionItem } from '../types.ts';

/**
 * Scores action items based on a given pattern.
 *
 * @param {Array} items - The array of items to be scored.
 * @param {string} pattern - The pattern to be used for scoring.
 * @returns {Array} - The array of scored items.
 */
export default function scoreActionItems(
  items: ActionItem[],
  pattern: string,
): ActionItem[] {
  if (!items?.length) return [];
  if (!pattern || pattern.length < DEFAULT_MINIMUM_MATCH) return items;

  return items
    .map((item) => ({
      ...item,
      score: Math.max(scoreItem(item.title, pattern), scoreItem(item.domain, pattern)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}
