import { useEffect, memo } from "react";
import { ActionItem } from "../utils/types";
import { List, RowComponentProps, useListRef } from "react-window";
import { Badge } from "./ui/badge";
import { Empty, EmptyHeader, EmptyDescription, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Item, ItemTitle, ItemContent, ItemMedia, ItemDescription } from "./ui/item";
import { Shell } from "lucide-react";
import "../assets/tailwind.css";

const truncateMiddle = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  const ellipsis = "…";
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return str.slice(0, frontChars) + ellipsis + str.slice(-backChars);
};

interface ActionListProps {
  actions: ActionItem[];
  selected: number;
  onSelect: (index: number) => void;
  onAction: (action: ActionItem) => void;
}

const Favicon = memo(({ url }: { url: string }) => {
  const iconSrc = getFavicon(url);
  return <img className="w-5 h-5 rounded-[4px] inline-block" src={iconSrc} alt="Favicon" />;
});

const EmptyState = memo(() => {
  return (
    <Empty className="font-mono h-[416px]">
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

function ActionList({ actions, selected, onSelect, onAction }: ActionListProps) {
  const bookmarkListRef = useListRef(null);

  const Action = ({
    index,
    style,
    actions,
  }: RowComponentProps<{
    actions: ActionItem[];
  }>) => {
    const action = actions[index];
    const { title, path, domain, url, icon } = action;

    return (
      <div className="p-[0px_12px]" style={style}>
        <Item
          role="listitem"
          onClick={() => onAction(action)}
          onMouseMove={() => onSelect(index)}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          className={`p-[4px_8px] gap-x-4 font-mono cursor-default ${
            index === selected ? "bg-muted/90 dark:bg-muted/80" : ""
          }`}
        >
          <ItemMedia className="self-center!">{icon ? icon : <Favicon url={url!} />}</ItemMedia>
          <ItemContent className="gap-0 flex-1 min-w-0">
            <ItemTitle className="font-normal text-sm line-clamp-1 wrap-anywhere dark:text-neutral-200 text-neutral-950">
              {title}
            </ItemTitle>
            <ItemDescription className="font-normal text-xs line-clamp-1 wrap-anywhere text-neutral-500 dark:text-neutral-400">
              {domain}
            </ItemDescription>
          </ItemContent>
          <ItemContent className="flex-none text-center">
            {path ? (
              <Badge
                className="border-neutral-300 dark:border-neutral-600 h-5 min-w-5 rounded-full px-1.5 font-mono text-xs max-w-[250px] overflow-hidden whitespace-nowrap relative text-neutral-500 dark:text-neutral-400 hidden sm:inline-flex items-center justify-center tracking-tighter"
                variant="outline"
                title={path}
              >
                {truncateMiddle(path, 30)}
              </Badge>
            ) : null}
          </ItemContent>
        </Item>
      </div>
    );
  };

  useEffect(() => {
    bookmarkListRef.current?.scrollToRow({ index: selected, behavior: "instant", align: "auto" });
  }, [selected]);

  if (!actions || actions.length <= 0) {
    return <EmptyState />;
  }

  return (
    <div className="py-2">
      <List
        listRef={bookmarkListRef}
        rowComponent={Action}
        rowCount={actions.length}
        rowHeight={50}
        rowProps={{ actions }}
        className="overscroll-contain scrollbar-hide h-[400px] w-full"
      />
    </div>
  );
}

export default ActionList;
