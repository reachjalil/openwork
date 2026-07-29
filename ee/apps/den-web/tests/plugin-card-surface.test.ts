import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

function readDashboardComponent(name: string) {
  return readFileSync(
    fileURLToPath(new URL(`../app/(den)/dashboard/_components/${name}`, import.meta.url)),
    "utf8",
  );
}

describe("flat plugin card surface", () => {
  test("shares one semantic flat-color treatment across Den and Marketplace", () => {
    const surface = readDashboardComponent("plugin-card-surface.tsx");
    const plugins = readDashboardComponent("plugins-screen.tsx");
    const marketplace = readDashboardComponent("marketplace-detail-screen.tsx");

    expect(plugins).toContain('className={pluginCardSurfaceClassName}');
    expect(marketplace).toContain("pluginCardSurfaceClassName");
    expect(plugins).toContain('<PluginCardArtwork size="catalog" />');
    expect(marketplace).toContain('<PluginCardArtwork size="marketplace" />');
    expect(surface).toContain("bg-[var(--dls-surface)]");
    expect(surface).toContain("border-[var(--dls-border)]");
    expect(surface).toContain("bg-[var(--dls-hover)]");
  });

  test("keeps hover and keyboard focus states without decorative effects", () => {
    const surface = readDashboardComponent("plugin-card-surface.tsx");
    const plugins = readDashboardComponent("plugins-screen.tsx");
    const marketplace = readDashboardComponent("marketplace-detail-screen.tsx");
    const inScopeSource = `${surface}\n${plugins}\n${marketplace}`;

    expect(surface).toContain("hover:border-gray-300");
    expect(surface).toContain("focus-visible:ring-[var(--dls-accent)]");
    expect(inScopeSource).not.toContain("StaticSeededGradient");
    expect(surface).not.toContain("gradient");
    expect(surface).not.toContain("shadow");
    expect(surface).not.toContain("translate");
  });
});
