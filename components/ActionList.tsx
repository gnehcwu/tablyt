import { useEffect, memo, useMemo } from "react";
import { ActionItem } from "@/utils/types";
import { BOOKMARK_PATH_SEPARATOR } from "@/utils/constants";
import getFavicon from "@/utils/getFavicon";
import { List, RowComponentProps, useListRef } from "react-window";
import { Badge } from "./ui/badge";
import { Kbd } from "./ui/kbd";
import { Empty, EmptyHeader, EmptyDescription, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Item, ItemTitle, ItemContent, ItemMedia, ItemDescription } from "./ui/item";
import { Skeleton } from "./ui/skeleton";
import { Bookmark, Folder, Shell } from "lucide-react";
import "@/assets/tailwind.css";

const ELLIPSIS = "…";

const truncateSegment = (segment: string, max: number): string => {
  if (segment.length <= max) return segment;
  const charsToShow = max - ELLIPSIS.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return segment.slice(0, frontChars) + ELLIPSIS + segment.slice(-backChars);
};

// Truncate a breadcrumb folder path so the hierarchy stays legible. Rather than
// lopping whole folders off one end, split on the separator and shrink each
// segment in its own middle, sharing the character budget across segments. A
// single-segment string falls back to plain middle truncation.
export const truncatePath = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;

  const segments = str.split(BOOKMARK_PATH_SEPARATOR);
  if (segments.length === 1) return truncateSegment(str, maxLength);

  const separatorChars = BOOKMARK_PATH_SEPARATOR.length * (segments.length - 1);
  const availableChars = maxLength - separatorChars;
  const charsPerSegment = Math.max(2, Math.floor(availableChars / segments.length));

  return segments.map((segment) => truncateSegment(segment, charsPerSegment)).join(BOOKMARK_PATH_SEPARATOR);
};

interface ActionListProps {
  loading: boolean;
  actions: ActionItem[];
  selected: number;
  onSelect: (index: number) => void;
  onAction: (action: ActionItem) => void;
}

// Source → section title. Sources without an entry (e.g. history, the
// web-search fallback) render no header.
const SECTION_LABELS: Record<string, string> = {
  favorite: "Favorites",
  tab: "Open tabs",
  bookmark: "Bookmarks",
  action: "Actions",
};

const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 50;

// A header sits above the first row of each section; items carry their index
// into the (header-free) `actions` array so selection/keyboard nav is unaffected.
type DisplayRow =
  | { kind: "header"; label: string }
  | { kind: "item"; item: ActionItem; itemIndex: number };

export function buildDisplayRows(actions: ActionItem[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  let lastSource: string | null = null;
  actions.forEach((item, itemIndex) => {
    const label = item.source ? SECTION_LABELS[item.source] : undefined;
    if (label && item.source !== lastSource) {
      rows.push({ kind: "header", label });
    }
    lastSource = item.source ?? null;
    rows.push({ kind: "item", item, itemIndex });
  });
  return rows;
}

const Favicon = memo(({ url }: { url: string }) => {
  const iconSrc = getFavicon(url);
  return <img className="w-5 h-5 rounded-[4px] inline-block" src={iconSrc} alt="Favicon" />;
});

const EmptyState = memo(() => {
  return (
    <Empty className="font-mono h-[396px]">
      <EmptyHeader>
        <EmptyMedia variant="default">
          <Shell size={48} className="dark:text-neutral-400 text-neutral-600" />
        </EmptyMedia>
        <EmptyTitle className="dark:text-neutral-400 text-neutral-600">No results found</EmptyTitle>
        <EmptyDescription className="dark:text-neutral-400 text-neutral-600">
          Try again with a different keyword
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
});

const SKELETON_COUNT = 8;
const SKELETON_WIDTHS = Array.from({ length: SKELETON_COUNT }, (_, i) => ({
  title: 40 + ((i * 17 + 7) % 36),
  subtitle: 25 + ((i * 13 + 11) % 31),
}));

function LoadingState() {
  return (
    <div className="flex flex-col justify-between h-[396px] py-2 px-3">
      {SKELETON_WIDTHS.map(({ title, subtitle }, i) => (
        <Item key={i} role="listitem" size="sm" className="w-full h-[50px] rounded-xl p-1!">
          <ItemContent className="flex-1 flex flex-col content-center h-full gap-0 gap-y-2! justify-center">
            <ItemTitle className="w-full">
              <Skeleton className="h-[13px]" style={{ width: `${title}%` }} />
            </ItemTitle>
            <ItemDescription className="w-full">
              <Skeleton className="h-[9px]" style={{ width: `${subtitle}%` }} />
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

const Row = ({
  index,
  style,
  rows,
  selected,
  onSelect,
  onAction,
}: RowComponentProps<{
  rows: DisplayRow[];
  selected: number;
  onSelect: (index: number) => void;
  onAction: (action: ActionItem) => void;
}>) => {
  const row = rows[index];

  if (row.kind === "header") {
    return (
      <div style={style} className="flex items-end px-2 pb-1 pt-3 select-none">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
          {row.label}
        </span>
      </div>
    );
  }

  const { item, itemIndex } = row;
  const { title, path, domain, url, icon, hint, source, bookmarkId } = item;
  const isSelected = itemIndex === selected;
  const isBookmarkedRow = (source === "tab" || source === "history") && !!bookmarkId;

  const isFolder = source === "folder";

  // Bookmark rows drop the redundant top-level root ("Bookmarks Bar" / "Other
  // Bookmarks") and middle-truncate the remaining path to a fixed budget — the
  // nested folders carry the signal and the full path is on hover. Folder rows
  // (the move-bookmark picker) instead show the complete path and rely on CSS
  // ellipsis to truncate only when it actually overflows the badge.
  const folderSegments = path ? path.split(BOOKMARK_PATH_SEPARATOR) : [];
  const folderPath = folderSegments.length > 1 ? folderSegments.slice(1).join(BOOKMARK_PATH_SEPARATOR) : path;
  const badgeLabel = isFolder ? path ?? "" : truncatePath(folderPath ?? "", 30);

  return (
    <Item
      role="listitem"
      onClick={() => onAction(item)}
      onMouseMove={() => onSelect(itemIndex)}
      className={`rounded-xl p-[4px_8px] gap-x-4 font-mono cursor-default transition-none! ${
        isSelected ? "bg-neutral-200 dark:bg-neutral-800" : ""
      }`}
      style={style}
    >
      <ItemMedia className="self-center!">
        {icon ? (
          icon
        ) : source === "folder" ? (
          <Folder className="w-5 h-5 text-neutral-500 dark:text-neutral-400" aria-label="Folder" />
        ) : (
          <Favicon url={url!} />
        )}
      </ItemMedia>
      <ItemContent className="gap-0 flex-1 min-w-0">
        <ItemTitle className="font-normal text-sm line-clamp-1 wrap-anywhere dark:text-neutral-200 text-neutral-950">
          {title || "-"}
        </ItemTitle>
        {source !== "folder" && (
          <ItemDescription className="font-normal text-xs line-clamp-1 wrap-anywhere text-neutral-500 dark:text-neutral-400">
            {domain || "-"}
          </ItemDescription>
        )}
      </ItemContent>
      <ItemContent className="flex-none text-center">
        {isBookmarkedRow ? (
          <Bookmark
            className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 hidden sm:inline-block"
            aria-label="Bookmarked"
          />
        ) : hint ? (
          <span
            className={`items-center gap-x-1.5 font-mono text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline-flex ${
              isSelected ? "opacity-100" : "opacity-0"
            }`}
          >
            {hint}
            <Kbd className="rounded-md text-xs font-normal">⏎</Kbd>
          </span>
        ) : path ? (
          <Badge
            className="border-black/15 dark:border-white/25 h-5 min-w-5 rounded-full px-2 font-mono text-xs max-w-[250px] overflow-hidden whitespace-nowrap relative text-neutral-500 dark:text-neutral-400 hidden sm:inline-flex items-center justify-start tracking-tight"
            variant="outline"
            title={path}
          >
            <span className="min-w-0 truncate">{badgeLabel}</span>
          </Badge>
        ) : null}
      </ItemContent>
    </Item>
  );
};

function ActionList({ actions, selected, onSelect, onAction, loading }: ActionListProps) {
  const bookmarkListRef = useListRef(null);

  const rows = useMemo(() => buildDisplayRows(actions), [actions]);
  const selectedRowIndex = useMemo(
    () => rows.findIndex((r) => r.kind === "item" && r.itemIndex === selected),
    [rows, selected]
  );

  useEffect(() => {
    if (selectedRowIndex < 0) return;

    // Boundaries: last item → align its bottom to the viewport bottom (full
    // reveal); first item → scroll to the very top so its section header stays
    // visible. Everything in between uses minimal "auto" scrolling.
    const isFirstItem = selected === 0;
    const isLastItem = selected === actions.length - 1;
    const scroll = () =>
      bookmarkListRef.current?.scrollToRow({
        index: isFirstItem ? 0 : selectedRowIndex,
        align: isLastItem ? "end" : isFirstItem ? "start" : "auto",
        behavior: "instant",
      });

    // First call jumps into the target region and forces those rows to render;
    // the rAF call re-aligns once layout has settled. Without it, a long wrap
    // (e.g. first → last) lands short because the destination rows weren't
    // measured yet when the scroll was applied.
    scroll();
    const raf = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(raf);
  }, [selectedRowIndex]);

  if (loading) return <LoadingState />;

  if (!actions || actions.length <= 0) {
    return <EmptyState />;
  }

  return (
    <div className="px-3 py-2">
      <List
        listRef={bookmarkListRef}
        rowComponent={Row}
        rowCount={rows.length}
        rowHeight={(index) => (rows[index]?.kind === "header" ? HEADER_HEIGHT : ROW_HEIGHT)}
        rowProps={{ rows, selected, onSelect, onAction }}
        className="overscroll-contain scrollbar-hide h-[380px] w-full"
      />
    </div>
  );
}

export default ActionList;
