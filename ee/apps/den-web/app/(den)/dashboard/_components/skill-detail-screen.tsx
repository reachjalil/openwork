"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DenButton, buttonVariants } from "../../_components/ui/button";
import { getEditSkillRoute, getSkillsRoute } from "../../_lib/den-org";
import { useOrgDashboard } from "../_providers/org-dashboard-provider";
import { deleteSkill, skillQueryKeys, useSkill } from "./skill-data";

export function SkillDetailScreen({ skillId }: { skillId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgSlug } = useOrgDashboard();
  const { data: skill, isLoading, error } = useSkill(skillId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!skill || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteSkill(skill.id);
      queryClient.removeQueries({ queryKey: skillQueryKeys.detail(skill.id) });
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.list() });
      router.push(getSkillsRoute(orgSlug));
      router.refresh();
    } catch (deleteFailure) {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : "Failed to delete skill.");
      setDeleteBusy(false);
    }
  }

  if (isLoading && !skill) return <DetailNotice>Loading skill...</DetailNotice>;
  if (!skill) return <DetailNotice error>{error instanceof Error ? error.message : "That skill could not be found."}</DetailNotice>;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={getSkillsRoute(orgSlug)} className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to skills
        </Link>
        <div className="flex gap-2">
          <Link href={getEditSkillRoute(orgSlug, skill.id)} className={buttonVariants({ variant: "secondary" })}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Link>
          <DenButton variant="destructive" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete</DenButton>
        </div>
      </div>

      <header className="rounded-[28px] border border-gray-200 bg-white p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-[28px] font-semibold tracking-[-0.04em] text-gray-950">{skill.name}</h1>
            <p className="mt-2 text-[15px] leading-7 text-gray-600">{skill.description}</p>
          </div>
        </div>
      </header>

      <article className="mt-5 overflow-hidden rounded-[28px] border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-gray-950">Complete skill body</h2>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words px-6 py-6 font-mono text-[13px] leading-6 text-gray-800">{skill.body}</pre>
      </article>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" onClick={deleteBusy ? undefined : () => setDeleteOpen(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-skill-title" className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash2 className="h-5 w-5" aria-hidden /></div>
              <div>
                <h2 id="delete-skill-title" className="text-[18px] font-semibold text-gray-950">Delete “{skill.name}”?</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">This removes the skill from the organization. This action cannot be undone.</p>
              </div>
            </div>
            {deleteError ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <DenButton variant="secondary" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>Cancel</DenButton>
              <DenButton variant="destructive" icon={Trash2} loading={deleteBusy} onClick={() => void handleDelete()}>Delete “{skill.name}”</DenButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailNotice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="mx-auto max-w-[900px] px-6 py-8 md:px-8">
      <div className={`rounded-2xl border px-5 py-8 text-[14px] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}>{children}</div>
    </div>
  );
}
