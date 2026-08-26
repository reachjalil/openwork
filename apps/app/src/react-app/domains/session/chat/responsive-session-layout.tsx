/** @jsxImportSource react */
import type { Ref } from "react";

export type NarrowSessionPane = "chat" | "split" | "panel";

export type NarrowPaneOption = {
  id: NarrowSessionPane;
  label: string;
};

export const NARROW_PANE_MIN_TARGET_PX = 44;

export function shouldShowNarrowPaneSwitcher(
  narrow: boolean,
  hasSplit: boolean,
  hasPanel: boolean,
) {
  return narrow && (hasSplit || hasPanel);
}

export function availableNarrowPane(
  pane: NarrowSessionPane,
  hasSplit: boolean,
  hasPanel: boolean,
): NarrowSessionPane {
  if (pane === "split" && !hasSplit) return "chat";
  if (pane === "panel" && !hasPanel) return "chat";
  return pane;
}

export function NarrowPaneSwitcher(props: {
  activePane: NarrowSessionPane;
  options: NarrowPaneOption[];
  navigationRef?: Ref<HTMLElement>;
  onSelect: (pane: NarrowSessionPane) => void;
}) {
  return (
    <nav
      ref={props.navigationRef}
      className="grid shrink-0 border-b border-border bg-dls-surface px-1"
      style={{ gridTemplateColumns: `repeat(${props.options.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label="Visible session pane"
      data-narrow-pane-switcher
    >
      {props.options.map((option) => {
        const active = option.id === props.activePane;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`narrow-session-pane-${option.id}`}
            data-narrow-pane={option.id}
            className={`min-w-0 truncate border-b-2 px-2 text-xs font-medium transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ minHeight: NARROW_PANE_MIN_TARGET_PX }}
            onClick={() => props.onSelect(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}

export type ViewportBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function isReachableViewportBox(box: ViewportBox, viewport: { width: number; height: number }) {
  return box.width > 0
    && box.height > 0
    && box.left >= 0
    && box.top >= 0
    && box.right <= viewport.width
    && box.bottom <= viewport.height;
}

export function hasHorizontalDocumentOverflow(documentWidth: number, viewportWidth: number) {
  return documentWidth > viewportWidth;
}
