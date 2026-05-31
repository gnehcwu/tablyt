import { useCallback, useEffect, useState } from "react";
import type { ActionItem } from "@/utils/types";
import {
  entryForItem,
  favoriteKeyForItem,
  subscribeFavorites,
  toggleFavorite,
  type FavoriteEntry,
} from "@/utils/favorites";

export interface UseFavorites {
  favorites: FavoriteEntry[];
  isFavorite: (item: ActionItem) => boolean;
  toggle: (item: ActionItem) => void;
}

// Reactive view of persisted favorites. The storage write triggers the
// subscription, which updates state in every palette instance (including other
// tabs), so the Favorites section stays in sync without manual refetching.
export default function useFavorites(): UseFavorites {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => subscribeFavorites(setFavorites), []);

  const isFavorite = useCallback(
    (item: ActionItem) => {
      const key = favoriteKeyForItem(item);
      return key !== undefined && favorites.some((f) => f.key === key);
    },
    [favorites]
  );

  const toggle = useCallback((item: ActionItem) => {
    const entry = entryForItem(item);
    if (entry) void toggleFavorite(entry);
  }, []);

  return { favorites, isFavorite, toggle };
}
