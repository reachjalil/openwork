import { Puzzle } from "lucide-react";

export const pluginCardSurfaceClassName =
  "group block overflow-hidden rounded-2xl border border-[var(--dls-border)] bg-[var(--dls-surface)] transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dls-accent)] focus-visible:ring-offset-2";

type PluginCardArtworkProps = {
  size: "catalog" | "marketplace";
};

const artworkSizeClasses: Record<PluginCardArtworkProps["size"], string> = {
  catalog: "w-[68px]",
  marketplace: "w-[64px]",
};

const iconSizeClasses: Record<PluginCardArtworkProps["size"], string> = {
  catalog: "h-10 w-10",
  marketplace: "h-9 w-9",
};

export function PluginCardArtwork({ size }: PluginCardArtworkProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[var(--dls-hover)] ${artworkSizeClasses[size]}`}
      aria-hidden
    >
      <div
        className={`flex items-center justify-center rounded-[12px] border border-[var(--dls-border)] bg-[var(--dls-surface)] ${iconSizeClasses[size]}`}
      >
        <Puzzle className="h-4 w-4 text-gray-700" />
      </div>
    </div>
  );
}
