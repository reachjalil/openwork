"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DenButton } from "../../_components/ui/button";
import { DenInput } from "../../_components/ui/input";
import { DenTextarea } from "../../_components/ui/textarea";
import { getSkillRoute, getSkillsRoute } from "../../_lib/den-org";
import { useOrgDashboard } from "../_providers/org-dashboard-provider";
import { createSkill, skillQueryKeys, updateSkill, useSkill } from "./skill-data";

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function SkillEditorScreen({ skillId }: { skillId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgSlug } = useOrgDashboard();
  const skillQuery = useSkill(skillId ?? "");
  const skill = skillQuery.data;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!skill) return;
    setName(skill.name);
    setDescription(skill.description);
    setBody(skill.body);
  }, [skill]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const trimmedBody = body.trim();
  const nameValid = SKILL_NAME_PATTERN.test(trimmedName) && trimmedName.length <= 64;
  const canSave = nameValid && Boolean(trimmedDescription) && trimmedDescription.length <= 1024 && Boolean(trimmedBody);
  const backHref = skillId ? getSkillRoute(orgSlug, skillId) : getSkillsRoute(orgSlug);

  async function handleSave() {
    if (!canSave || busy) return;
    setBusy(true);
    setSaveError(null);
    try {
      const saved = skillId
        ? await updateSkill(skillId, { name: trimmedName, description: trimmedDescription, body: trimmedBody })
        : await createSkill({ name: trimmedName, description: trimmedDescription, body: trimmedBody });
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
      router.push(getSkillRoute(orgSlug, saved.id));
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save skill.");
    } finally {
      setBusy(false);
    }
  }

  if (skillId && skillQuery.isLoading && !skill) {
    return <EditorNotice>Loading skill...</EditorNotice>;
  }

  if (skillId && !skill) {
    return <EditorNotice error>{skillQuery.error instanceof Error ? skillQuery.error.message : "That skill could not be found."}</EditorNotice>;
  }

  return (
    <div className="mx-auto max-w-[860px] px-6 py-8 md:px-8">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to {skillId ? "skill" : "skills"}
      </Link>

      <div className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-gray-950">
              {skill ? `Edit ${skill.name}` : "Create a skill"}
            </h1>
            <p className="mt-1 text-[14px] leading-6 text-gray-500">Write the complete instructions an agent should load when it uses this skill.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          <label className="grid gap-2 text-[13px] font-medium text-gray-800">
            Name
            <DenInput value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. customer-research" disabled={busy} />
            {name && !nameValid ? <span className="font-normal text-red-600">Use lowercase letters, numbers, and single hyphens (64 characters maximum).</span> : null}
          </label>
          <label className="grid gap-2 text-[13px] font-medium text-gray-800">
            Description
            <DenInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder="When should an agent use this skill?" disabled={busy} />
          </label>
          <label className="grid gap-2 text-[13px] font-medium text-gray-800">
            Skill body
            <DenTextarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="# Instructions\n\nDescribe the complete workflow..."
              rows={18}
              disabled={busy}
              className="resize-y font-mono leading-6"
            />
          </label>
        </div>

        {saveError ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{saveError}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Link href={backHref} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-5 text-[13px] font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
          <DenButton loading={busy} disabled={!canSave} onClick={() => void handleSave()}>
            {skillId ? "Save changes" : "Create skill"}
          </DenButton>
        </div>
      </div>
    </div>
  );
}

function EditorNotice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-8 md:px-8">
      <div className={`rounded-2xl border px-5 py-8 text-[14px] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}>{children}</div>
    </div>
  );
}
