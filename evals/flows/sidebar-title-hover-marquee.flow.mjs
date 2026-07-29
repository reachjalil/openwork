import {
  createSession,
  ensureSessionWorkspace,
} from "./lib/session-workspace.mjs";

const LONG_TITLE =
  "Review the OpenWork desktop sidebar title animation across a deliberately overflowing conversation name";

const readTitle = (sessionId) => `(() => {
  const row = [...document.querySelectorAll('[data-sidebar-session-id]')]
    .find((entry) => entry.getAttribute('data-sidebar-session-id') === ${JSON.stringify(sessionId)});
  if (!(row instanceof HTMLElement)) return null;
  const viewport = row.querySelector('span.min-w-0.flex-1.overflow-hidden.whitespace-nowrap');
  if (!(viewport instanceof HTMLElement)) return null;
  const title = viewport.querySelector('span[aria-hidden="true"]');
  if (!(title instanceof HTMLElement)) return null;
  const titleStyle = getComputedStyle(title);
  const viewportStyle = getComputedStyle(viewport);
  const titleRect = title.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  return {
    left: titleRect.left,
    top: titleRect.top,
    width: titleRect.width,
    height: titleRect.height,
    clientWidth: viewport.clientWidth,
    scrollWidth: viewport.scrollWidth,
    transform: titleStyle.transform,
    translate: titleStyle.translate,
    animationName: titleStyle.animationName,
    maskImage: viewportStyle.maskImage || viewportStyle.webkitMaskImage,
    overflow: viewportStyle.overflow,
    viewportLeft: viewportRect.left,
    viewportRight: viewportRect.right,
  };
})()`;

export default {
  id: "sidebar-title-hover-marquee",
  title: "Overflowing session titles become readable after hover intent without moving row controls",
  kind: "user-facing",
  steps: [
    {
      name: "Overflow-only title motion preserves the sidebar row",
      run: async (ctx) => {
        await ensureSessionWorkspace(ctx, "sidebar-title-hover-marquee");
        const sessionId = await createSession(ctx, "created session");
        await ctx.control("session.rename", { sessionId, title: LONG_TITLE });
        const titleState = readTitle(sessionId);
        await ctx.waitFor(
          `${titleState}?.scrollWidth > ${titleState}?.clientWidth`,
          {
            timeoutMs: 30_000,
            label: "overflowing session title",
          },
        );

        const before = await ctx.eval(titleState);
        ctx.assert(before, "Could not measure the overflowing title.");
        await ctx.client.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(before.left + Math.min(before.width / 2, 80)),
          y: Math.round(before.top + before.height / 2),
        });
        await new Promise((resolve) => setTimeout(resolve, 1_100));

        await ctx.prove("A genuinely overflowing title moves only after hover intent and keeps clipped-edge affordance", {
          action: async () => {},
          assert: async () => {
            const after = await ctx.eval(titleState);
            ctx.assert(after, "Could not measure the title after hover.");
            ctx.assert(
              after.animationName !== "none" ||
                after.transform !== "none" ||
                after.translate !== "none" ||
                after.left < before.left - 1,
              `Expected visible title motion after hover intent: ${JSON.stringify({ before, after })}`,
            );
            ctx.assert(
              after.maskImage !== "none",
              `Expected a clipped-edge mask while the title is moving, got ${after.maskImage}.`,
            );
            ctx.assert(
              after.viewportLeft === before.viewportLeft && after.viewportRight === before.viewportRight,
              "The title viewport changed position while animating.",
            );
          },
          screenshot: {
            name: "overflowing-title-mid-animation",
            requireText: ["Review the OpenWork desktop sidebar"],
          },
        });
      },
    },
  ],
};
