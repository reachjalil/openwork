import { expect } from "vitest";
import { test } from "@openwork/testkit";
import {
  availableNarrowPane,
  hasHorizontalDocumentOverflow,
  isReachableViewportBox,
  NARROW_PANE_MIN_TARGET_PX,
  shouldShowNarrowPaneSwitcher,
} from "../../apps/app/src/react-app/domains/session/chat/responsive-session-layout";

test("narrow session panes stay selectable and inside the viewport", ({ evidence }) => {
  expect(shouldShowNarrowPaneSwitcher(false, true, true)).toBe(false);
  expect(shouldShowNarrowPaneSwitcher(true, false, false)).toBe(false);
  expect(shouldShowNarrowPaneSwitcher(true, true, false)).toBe(true);
  expect(shouldShowNarrowPaneSwitcher(true, false, true)).toBe(true);

  expect(availableNarrowPane("split", false, true)).toBe("chat");
  expect(availableNarrowPane("panel", true, false)).toBe("chat");
  expect(availableNarrowPane("split", true, false)).toBe("split");
  expect(availableNarrowPane("panel", false, true)).toBe("panel");

  expect(NARROW_PANE_MIN_TARGET_PX).toBeGreaterThanOrEqual(44);
  expect(isReachableViewportBox(
    { left: 0, top: 0, right: 390, bottom: 44, width: 390, height: 44 },
    { width: 390, height: 844 },
  )).toBe(true);
  expect(isReachableViewportBox(
    { left: 0, top: 0, right: 391, bottom: 44, width: 391, height: 44 },
    { width: 390, height: 844 },
  )).toBe(false);
  expect(hasHorizontalDocumentOverflow(390, 390)).toBe(false);
  expect(hasHorizontalDocumentOverflow(391, 390)).toBe(true);

  evidence.recordAssertionEvidence(
    "Narrow session panes remain reachable",
    "The switcher appears only when another pane exists, unavailable selections fall back to chat, controls meet the 44px target, and viewport bounds reject horizontal overflow.",
    true,
  );
});
