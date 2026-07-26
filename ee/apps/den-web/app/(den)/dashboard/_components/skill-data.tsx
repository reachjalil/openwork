"use client";

import { useQuery } from "@tanstack/react-query";
import { composeSkillMarkdown, parseSkillMarkdown } from "@openwork-ee/utils";
import { getRequestError, requestJson } from "../../_lib/den-flow";

export type DenSkill = {
  id: string;
  name: string;
  description: string;
  body: string;
  updatedAt: string | null;
};

export type SkillInput = Pick<DenSkill, "name" | "description" | "body">;

export const skillQueryKeys = {
  all: ["skills"] as const,
  list: () => [...skillQueryKeys.all, "list"] as const,
  detail: (id: string) => [...skillQueryKeys.all, "detail", id] as const,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseSkillItem(value: unknown): DenSkill | null {
  if (!isRecord(value) || value.objectType !== "skill" || !isRecord(value.latestVersion)) return null;
  const id = stringValue(value.id);
  const source = stringValue(value.latestVersion.rawSourceText);
  if (!id || !source) return null;

  const parsed = parseSkillMarkdown(source);
  if (!parsed.hasFrontmatter || !parsed.name || !parsed.description) return null;

  return {
    body: parsed.body.trim(),
    description: parsed.description,
    id,
    name: parsed.name,
    updatedAt: stringValue(value.updatedAt),
  };
}

export function skillRequestBody(input: SkillInput) {
  return {
    input: {
      rawSourceText: composeSkillMarkdown(input.name, input.description, input.body),
    },
  };
}

async function expectSkillResponse(path: string, init: RequestInit, failureLabel: string): Promise<DenSkill> {
  const { response, payload } = await requestJson(path, init, 20000);
  if (!response.ok) throw getRequestError(payload, response, `${failureLabel} (${response.status}).`);
  const item = isRecord(payload) ? parseSkillItem(payload.item) : null;
  if (!item) throw new Error("The Den API returned an invalid skill.");
  return item;
}

export async function listSkills(): Promise<DenSkill[]> {
  const { response, payload } = await requestJson("/v1/config-objects?type=skill&status=active&limit=100", { method: "GET" }, 20000);
  if (!response.ok) throw getRequestError(payload, response, `Failed to load skills (${response.status}).`);
  if (!isRecord(payload) || !Array.isArray(payload.items)) return [];
  return payload.items.flatMap((item) => {
    const skill = parseSkillItem(item);
    return skill ? [skill] : [];
  });
}

export function getSkill(skillId: string): Promise<DenSkill> {
  return expectSkillResponse(`/v1/config-objects/${encodeURIComponent(skillId)}`, { method: "GET" }, "Failed to load skill");
}

export function createSkill(input: SkillInput): Promise<DenSkill> {
  return expectSkillResponse("/v1/config-objects", {
    method: "POST",
    body: JSON.stringify({ ...skillRequestBody(input), sourceMode: "cloud", type: "skill" }),
  }, "Failed to create skill");
}

export function updateSkill(skillId: string, input: SkillInput): Promise<DenSkill> {
  return expectSkillResponse(`/v1/config-objects/${encodeURIComponent(skillId)}/versions`, {
    method: "POST",
    body: JSON.stringify(skillRequestBody(input)),
  }, "Failed to save skill");
}

export function deleteSkill(skillId: string): Promise<DenSkill> {
  return expectSkillResponse(`/v1/config-objects/${encodeURIComponent(skillId)}/delete`, { method: "POST" }, "Failed to delete skill");
}

export function useSkills() {
  return useQuery({ queryKey: skillQueryKeys.list(), queryFn: listSkills });
}

export function useSkill(skillId: string) {
  return useQuery({
    queryKey: skillQueryKeys.detail(skillId),
    queryFn: () => getSkill(skillId),
    enabled: Boolean(skillId),
  });
}
