import { describe, expect, test } from "bun:test";
import {
  getEditSkillRoute,
  getNewSkillRoute,
  getSkillRoute,
  getSkillsRoute,
} from "../app/(den)/_lib/den-org";
import {
  parseSkillItem,
  skillRequestBody,
} from "../app/(den)/dashboard/_components/skill-data";

const body = [
  "# Incident handoff",
  "",
  "Keep the complete context visible:",
  "",
  "```sh",
  "openwork verify-handoff",
  "```",
].join("\n");

describe("organization skill CRUD", () => {
  test("uses stable dedicated dashboard routes", () => {
    expect(getSkillsRoute("acme")).toBe("/dashboard/skills");
    expect(getNewSkillRoute("acme")).toBe("/dashboard/skills/new");
    expect(getSkillRoute("acme", "skill/id")).toBe("/dashboard/skills/skill%2Fid");
    expect(getEditSkillRoute("acme", "skill/id")).toBe("/dashboard/skills/skill%2Fid/edit");
  });

  test("round-trips complete Markdown bodies through the Den API shape", () => {
    const request = skillRequestBody({
      name: "incident-handoff",
      description: "Prepare and verify an incident handoff: keep every detail.",
      body,
    });
    const skill = parseSkillItem({
      id: "config_object_01",
      objectType: "skill",
      updatedAt: "2026-07-26T00:00:00.000Z",
      latestVersion: request.input,
    });

    expect(skill).toEqual({
      id: "config_object_01",
      name: "incident-handoff",
      description: "Prepare and verify an incident handoff: keep every detail.",
      body,
      updatedAt: "2026-07-26T00:00:00.000Z",
    });
  });

  test("rejects non-skill and body-less API items", () => {
    expect(parseSkillItem({ objectType: "command" })).toBeNull();
    expect(parseSkillItem({ id: "config_object_01", objectType: "skill", latestVersion: {} })).toBeNull();
  });
});
