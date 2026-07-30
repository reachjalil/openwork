/** @jsxImportSource react */
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Ellipsis, ExternalLink, FolderOpen, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { OpenworkServerError, type OpenworkServerClient, type OpenworkWorkspaceCatalogEntry } from "@/app/lib/openwork-server";
import { openDesktopPath, revealDesktopItemInDir } from "@/app/lib/desktop";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlatform } from "@/react-app/kernel/platform";
import { type ArtifactPanelTab, usePanelTabStore } from "../panel/panel-tab-store";
import { ArtifactAutosaveController } from "./artifact-autosave";
import { serializeSpreadsheet, type SpreadsheetRows } from "./artifact-spreadsheet-model";
import { isCollectibleArtifactTarget, openTargetFromWorkspaceFile, type BinaryData, type Data, type OpenTarget, type TextData } from "./open-target";
import { HTMLPreview, ImagePreview, MarkdownPreview, PdfPreview, PlainText, PreviewError, PreviewLoading, PreviewUnavailable } from "./preview";

const ArtifactTextEditor = lazy(() =>
  import("./artifact-text-editor").then((module) => ({ default: module.ArtifactTextEditor })),
);
const ArtifactSpreadsheetEditor = lazy(() =>
  import("./artifact-spreadsheet-editor").then((module) => ({ default: module.ArtifactSpreadsheetEditor })),
);
const ArtifactCodeView = lazy(() =>
  import("./artifact-code-view").then((module) => ({ default: module.ArtifactCodeView })),
);
const WorkspaceFileTree = lazy(() =>
  import("./workspace-file-tree").then((module) => ({ default: module.WorkspaceFileTree })),
);

const EMPTY_TRANSCRIPT_TARGETS: OpenTarget[] = [];
type ArtifactPanelProps = {
  sessionId: string;
  tab: ArtifactPanelTab;
  client: OpenworkServerClient | null;
  workspaceId: string | null;
  workspaceRoot: string;
  isRemoteWorkspace?: boolean;
  onClose: () => void;
};

type ArtifactPanelViewProps = {
  sessionId: string;
  client: OpenworkServerClient;
  workspaceId: string;
  workspaceRoot: string;
  isRemoteWorkspace?: boolean;
  target: OpenTarget;
  onClose: () => void;
};

type ArtifactQueryState =
  | (TextData & { updatedAt: number | null })
  | (BinaryData & { contentType: string | null; updatedAt: number | null });

type SpreadsheetDraft = { kind: "spreadsheet"; rows: SpreadsheetRows };
type ArtifactDraft = Data | SpreadsheetDraft;

const autosaveControllers = new WeakMap<OpenworkServerClient, Map<string, ArtifactAutosaveController<ArtifactDraft>>>();
const dirtyAutosaves = new Set<ArtifactAutosaveController<ArtifactDraft>>();

function flushRetainedAutosaves() {
  for (const autosave of dirtyAutosaves) autosave.flush();
}

function hasDirtyRetainedAutosave() {
  return dirtyAutosaves.size > 0;
}

function absoluteWorkspacePath(root: string, path: string) {
  const cleanRoot = root.trim().replace(/[/\\]+$/, "");
  const cleanPath = path.trim().replace(/^\.\//, "");
  
  return cleanRoot ? `${cleanRoot}/${cleanPath}` : cleanPath;
}

function isTextContent(target: OpenTarget): boolean {
  return ["markdown", "code", "text", "sheet", "html"].includes(target.preview) && !/\.(xlsx|xls|ods)$/i.test(target.value);
}

function dataEquals(left: ArtifactDraft, right: ArtifactDraft) {
  if (left.kind !== right.kind) return false;
  if (left.kind === "spreadsheet" && right.kind === "spreadsheet") {
    return left.rows.length === right.rows.length && left.rows.every((row, rowIndex) => {
      const other = right.rows[rowIndex];
      return other !== undefined && row.length === other.length && row.every((cell, columnIndex) => cell === other[columnIndex]);
    });
  }
  if (left.kind === "text" && right.kind === "text") return left.data === right.data;
  if (left.kind !== "binary" || right.kind !== "binary") return false;
  if (left.data.byteLength !== right.data.byteLength) return false;
  const leftBytes = new Uint8Array(left.data);
  const rightBytes = new Uint8Array(right.data);
  return leftBytes.every((value, index) => value === rightBytes[index]);
}

function isConflict(error: unknown) {
  return error instanceof OpenworkServerError && error.status === 409;
}

function conflictUpdatedAt(error: unknown) {
  if (!(error instanceof OpenworkServerError) || !error.details || typeof error.details !== "object") return null;
  if (!("currentUpdatedAt" in error.details)) return null;
  const value = error.details.currentUpdatedAt;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function editablePayload(data: ArtifactQueryState): ArtifactDraft {
  return data.kind === "text"
    ? { kind: "text", data: data.data }
    : { kind: "binary", data: data.data };
}

export function ArtifactPanel({ sessionId, tab, client, workspaceId, workspaceRoot, isRemoteWorkspace = false, onClose }: ArtifactPanelProps) {
  const transcriptTargets = usePanelTabStore((state) => state.transcriptArtifactTargets[sessionId] ?? EMPTY_TRANSCRIPT_TARGETS);
  const artifactTargets = useMemo(() => transcriptTargets.filter(isCollectibleArtifactTarget), [transcriptTargets]);
  const target = tab.target ?? artifactTargets.find((item) => item.id === tab.id) ?? null;

  if (!target || !client || !workspaceId) {
    return null;
  }

  return (
    <ArtifactPanelView
      sessionId={sessionId}
      client={client}
      workspaceId={workspaceId}
      workspaceRoot={workspaceRoot}
      isRemoteWorkspace={isRemoteWorkspace}
      target={target}
      onClose={onClose}
    />
  );
}

function ArtifactPanelView({ sessionId, client, workspaceId, workspaceRoot, isRemoteWorkspace = false, target, onClose }: ArtifactPanelViewProps) {
  const platform = usePlatform();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const isMermaidArtifact = target.kind === "file" && /\.mmd$/i.test(target.value);
  // Plain text opens directly in CodeMirror. Markdown and HTML default to
  // their rendered previews and retain the existing Edit toggle.
  const isDirectTextEdit = isTextContent(target) && target.preview === "text";
  const isDirectCodeEdit = target.kind === "file" && target.preview === "code";
  const canUseDesktopWorkspaceActions = !isRemoteWorkspace && platform.capabilities.revealInFileManager;
  const canUseDesktopFileActions = target.kind === "file" && canUseDesktopWorkspaceActions;
  const workspaceName = workspaceRoot.split(/[/\\]/).filter(Boolean).pop() ?? "Workspace";
  const [reloading, setReloading] = useState(false);

  const openWorkspaceFile = (entry: { path: string; size: number; mtimeMs: number }) => {
    const nextTarget = openTargetFromWorkspaceFile(entry.path, { size: entry.size, updatedAt: entry.mtimeMs });
    if (!nextTarget) return;
    usePanelTabStore.getState().openTab(sessionId, {
      id: nextTarget.id,
      type: "artifact",
      label: nextTarget.name,
      preview: nextTarget.preview,
      target: nextTarget,
    });
  };

  const { data, error, isError, isLoading } = useQuery<ArtifactQueryState>({
    queryKey: ["artifact-panel", workspaceId, target.id, target.updatedAt ?? null] as const,
    queryFn: async () => {
      if (target.kind === "url") {
        throw new Error("URLs open in browser tabs.");
      }
      else if (target.exists === false) {
        throw new Error("File not found in this workspace.");
      }

      if (isTextContent(target)) {
        const result = await client.readWorkspaceFile(workspaceId, target.value);

        return { kind: "text", data: result.content, updatedAt: result.updatedAt ?? null };
      }

      const before = await client.statWorkspaceFile(workspaceId, target.value);
      const result = await client.downloadWorkspaceFile(workspaceId, target.value);
      const after = await client.statWorkspaceFile(workspaceId, target.value);
      if (before.updatedAt !== after.updatedAt) {
        throw new Error("The file changed while it was loading. Try again.");
      }

      return { kind: "binary", data: result.data, contentType: result.contentType, updatedAt: after.updatedAt ?? null };
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  const autosave = useMemo(() => {
    let controllers = autosaveControllers.get(client);
    if (!controllers) {
      controllers = new Map();
      autosaveControllers.set(client, controllers);
    }
    const key = `${workspaceId}:${target.id}:${target.value}`;
    const existing = controllers.get(key);
    if (existing) return existing;

    const queryKey = ["artifact-panel", workspaceId, target.id, target.updatedAt ?? null] as const;
    const created = new ArtifactAutosaveController<ArtifactDraft>({
      initialValue: isTextContent(target)
        ? { kind: "text", data: "" }
        : { kind: "binary", data: new ArrayBuffer(0) },
      initialUpdatedAt: target.updatedAt ?? null,
      equals: dataEquals,
      isConflict,
      write: async (payload, baseUpdatedAt) => {
        if (target.kind !== "file") throw new Error("Cannot save non-file artifact.");
        const serialized = payload.kind === "spreadsheet"
          ? await serializeSpreadsheet(target.name, payload.rows)
          : payload;
        if (serialized.kind === "text") {
          return client.writeWorkspaceFile(workspaceId, {
            path: target.value,
            content: serialized.data,
            baseUpdatedAt,
          });
        }
        return client.writeWorkspaceBinaryFile(workspaceId, {
          path: target.value,
          data: serialized.data,
          baseUpdatedAt,
        });
      },
      onSaved: (payload, result) => {
        if (payload.kind === "spreadsheet") return;
        queryClient.setQueryData<ArtifactQueryState>(queryKey, (current) => payload.kind === "text"
          ? { kind: "text", data: payload.data, updatedAt: result.updatedAt }
          : {
              kind: "binary",
              data: payload.data,
              contentType: current?.kind === "binary" ? current.contentType : null,
              updatedAt: result.updatedAt,
            });
      },
    });
    controllers.set(key, created);
    created.subscribe(() => {
      if (created.getSnapshot().dirty) dirtyAutosaves.add(created);
      else dirtyAutosaves.delete(created);
    });
    return created;
  }, [client, queryClient, target.id, target.kind, target.value, workspaceId]);
  const autosaveState = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot);

  const [binaryObjectUrl, setBinaryObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data || data.kind !== "binary") {
      setBinaryObjectUrl(null);

      return;
    }

    const fallbackType = target.preview === "pdf" ? "application/pdf" : "application/octet-stream";
    const url = URL.createObjectURL(new Blob([data.data], { type: data.contentType ?? fallbackType }));

    setBinaryObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [data, target.preview]);

  useEffect(() => {
    setEditing(false);
  }, [target.id, workspaceId]);

  useEffect(() => {
    if (!data) return;
    autosave.acceptExternal(editablePayload(data), data.updatedAt);
  }, [autosave, data]);

  useEffect(() => {
    const flush = () => flushRetainedAutosaves();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      flush();
      if (!hasDirtyRetainedAutosave()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autosave]);

  const downloadFile = async (path: string, name: string) => {
    const result = await client.downloadWorkspaceFile(workspaceId, path);
    const url = URL.createObjectURL(new Blob([result.data], { type: result.contentType ?? "application/octet-stream" }));
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = name;
    anchor.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openFileExternally = async (path: string) => {
    if (isRemoteWorkspace) {
      await downloadFile(path, path.split(/[/\\]/).pop() ?? path);

      return;
    }

    try {
      await openDesktopPath(absoluteWorkspacePath(workspaceRoot, path));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not open this file.");
    }
  };

  const revealFile = async (path: string) => {
    if (isRemoteWorkspace) return;
    try {
      await revealDesktopItemInDir(absoluteWorkspacePath(workspaceRoot, path));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not show this file in your file manager.");
    }
  };

  const download = async () => {
    if (target.kind === "url") {
      return;
    }

    await downloadFile(target.value, target.name);
  };

  const openExternal = async () => {
    if (target.kind === "url") {
      window.open(target.value, "_blank", "noopener,noreferrer");

      return;
    }

    await openFileExternally(target.value);
  };

  const revealExternal = async () => {
    if (target.kind !== "file") return;
    await revealFile(target.value);
  };

  const reloadExternal = async () => {
    if (target.kind !== "file") return;
    setReloading(true);
    try {
      let next: ArtifactQueryState;
      if (isTextContent(target)) {
        const result = await client.readWorkspaceFile(workspaceId, target.value);
        const after = await client.statWorkspaceFile(workspaceId, target.value);
        if (result.updatedAt !== after.updatedAt) {
          throw new Error("The file changed while it was reloading. Try again.");
        }
        next = { kind: "text", data: result.content, updatedAt: result.updatedAt };
      } else {
        const before = await client.statWorkspaceFile(workspaceId, target.value);
        const result = await client.downloadWorkspaceFile(workspaceId, target.value);
        const after = await client.statWorkspaceFile(workspaceId, target.value);
        if (before.updatedAt !== after.updatedAt) {
          throw new Error("The file changed while it was reloading. Try again.");
        }
        next = {
          kind: "binary",
          data: result.data,
          contentType: result.contentType,
          updatedAt: after.updatedAt ?? null,
        };
      }
      autosave.applyReload(editablePayload(next), next.updatedAt);
      queryClient.setQueryData(
        ["artifact-panel", workspaceId, target.id, target.updatedAt ?? null] as const,
        next,
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not reload this file.");
    } finally {
      setReloading(false);
    }
  };

  const close = () => {
    autosave.flush();
    onClose();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background mac:bg-background/80 mac:backdrop-blur-2xl mac:backdrop-saturate-150">
        <div className="flex h-10 items-center gap-2 pe-2 ps-2">
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button variant="ghost" size="icon-sm" onClick={() => setTreeOpen((value) => !value)} aria-label={treeOpen ? "Hide workspace files" : "Show workspace files"}>
                  {treeOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                </Button>
              )}
            />
            <TooltipContent>{treeOpen ? "Hide workspace files" : "Show workspace files"}</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <h3 className="min-w-0 truncate text-sm font-medium text-foreground">
              {target.name}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {target.exists === false ? "missing" : autosaveState.ready ? (autosaveState.status === "saving" || autosaveState.dirty ? "Saving…" : "Saved") : ""}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isTextContent(target) && autosaveState.ready && !isDirectTextEdit && !isDirectCodeEdit ? (
              <Tooltip>
                <TooltipTrigger
                  render={(
                    <Button variant="ghost" size="sm" onClick={() => { if (editing) autosave.flush(); setEditing((value) => !value); }}>{editing ? "Done" : "Edit"}</Button>
                  )}
                />
                <TooltipContent>{editing ? "Stop editing" : "Edit artifact"}</TooltipContent>
              </Tooltip>
            ) : null}
            {target.kind === "file" || target.kind === "url" ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={(
                    <Button variant="ghost" size="icon-sm" aria-label="Artifact actions">
                      <Ellipsis />
                    </Button>
                  )}
                />
                <DropdownMenuContent align="end">
                  {target.kind === "file" ? (
                    <DropdownMenuItem onClick={() => void download()}>
                      <Download /> Download
                    </DropdownMenuItem>
                  ) : null}
                  {canUseDesktopFileActions ? (
                    <DropdownMenuItem onClick={() => void revealExternal()}>
                      <FolderOpen /> Show in folder
                    </DropdownMenuItem>
                  ) : null}
                  {target.kind === "url" || canUseDesktopFileActions ? (
                    <DropdownMenuItem onClick={() => void openExternal()}>
                      <ExternalLink /> Open externally
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={(
                  <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close artifact">
                    <X />
                  </Button>
                )}
              />
              <TooltipContent>Close artifact</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {autosaveState.failure ? (
        <div className="shrink-0 border-b border-border p-2">
          <Alert variant="warning" className="rounded-lg py-2">
            <AlertTriangle />
            <AlertTitle>{autosaveState.failure === "conflict" ? "This file changed outside OpenWork" : "Changes could not be saved"}</AlertTitle>
            <AlertDescription>
              <p>
                {autosaveState.failure === "conflict"
                  ? "Review the external version, then reload it or retry with your newest edits."
                  : autosaveState.error instanceof Error ? autosaveState.error.message : "Your newest edits are still here."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {autosaveState.failure === "conflict" ? (
                  <Button variant="outline" size="xs" disabled={reloading || autosaveState.status === "saving"} onClick={() => void reloadExternal()}>
                    {reloading ? "Reloading" : "Reload external version"}
                  </Button>
                ) : null}
                <Button
                  variant="default"
                  size="xs"
                  disabled={reloading || autosaveState.status === "saving"}
                  onClick={() => autosave.retry(conflictUpdatedAt(autosaveState.error) ?? autosaveState.baseUpdatedAt)}
                >
                  {autosaveState.status === "saving" ? "Retrying" : "Retry newest changes"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {treeOpen ? (
          <Suspense fallback={<div className="w-40 shrink-0 border-r border-border bg-muted/20" />}>
            <WorkspaceFileTree
              client={client}
              workspaceId={workspaceId}
              workspaceName={workspaceName}
              selectedPath={target.value}
              onOpenFile={openWorkspaceFile}
              fileActions={[
                { id: "download", label: "Download", run: (entry) => void downloadFile(entry.path, entry.path.split(/[/\\]/).pop() ?? entry.path) },
                ...(canUseDesktopWorkspaceActions
                  ? [
                    { id: "reveal", label: "Show in folder", run: (entry: OpenworkWorkspaceCatalogEntry) => void revealFile(entry.path) },
                    { id: "open-external", label: "Open externally", run: (entry: OpenworkWorkspaceCatalogEntry) => void openFileExternally(entry.path) },
                  ]
                  : []),
              ]}
            />
          </Suspense>
        ) : null}
        <div className="min-w-0 flex-1 overflow-hidden">
          {(!autosaveState.ready && isLoading) || (target.preview !== "sheet" && data?.kind === "binary" && !binaryObjectUrl) ? (
          <PreviewLoading />
        ) : isError && !autosaveState.ready ? (
          <PreviewError message={error instanceof Error ? error.message : "Failed to load artifact" } />
        ) : autosaveState.value.kind === "text" && (editing || isDirectTextEdit) ? (
          <TextEditor value={autosaveState.value.data} language={target.preview === "markdown" ? "markdown" : "text"} onChange={(value) => autosave.edit({ kind: "text", data: value })} />
        ) : target.preview === "markdown" && autosaveState.value.kind === "text" ? (
          <MarkdownPreview content={autosaveState.value.data} mermaidSource={isMermaidArtifact} />
        ) : target.preview === "code" && autosaveState.value.kind === "text" ? (
          <Suspense fallback={<PreviewLoading />}>
            <ArtifactCodeView
              name={target.name}
              path={target.value}
              content={autosaveState.value.data}
              editable={isDirectCodeEdit}
              onChange={(value) => autosave.edit({ kind: "text", data: value })}
            />
          </Suspense>
        ) : target.preview === "sheet" && autosaveState.ready ? (
          <SheetEditor
            key={`${workspaceId}:${target.id}`}
            name={target.name}
            source={autosaveState.value.kind === "spreadsheet"
              ? { kind: "rows", rows: autosaveState.value.rows }
              : { kind: "content", content: autosaveState.value, revision: autosaveState.sourceRevision }}
            onChange={(rows) => autosave.edit({ kind: "spreadsheet", rows })}
          />
        ) : target.preview === "html" && data?.kind === "text" ? (
          <HTMLPreview type="text" title={target.name} content={data.data} />
        ) : target.preview === "image" && data?.kind === "binary" && binaryObjectUrl ? (
          <ImagePreview src={binaryObjectUrl} alt={target.name} />
        ) : target.preview === "pdf" && data?.kind === "binary" && binaryObjectUrl ? (
          <PdfPreview url={binaryObjectUrl} title={target.name} />
        ) : data?.kind === "binary" && binaryObjectUrl && target.preview === "html" ? (
          <HTMLPreview type="binary" title={target.name} url={binaryObjectUrl} />
        ) : data?.kind === "text" ? (
          <PlainText content={data.data} />
        ) : (
          <PreviewUnavailable />
          )}
        </div>
      </div>
    </div>
  );
}

interface TextEditorProps extends React.ComponentProps<typeof ArtifactTextEditor> {
  value: string;
  language: "markdown" | "text";
  onChange: (value: string) => void;
}

function TextEditor({ value, language, onChange, ...props }: TextEditorProps) {
  return (
    <Suspense fallback={<PreviewLoading />}>
      <ArtifactTextEditor value={value} language={language} onChange={onChange} {...props} />
    </Suspense>
  );
}

interface SheetEditorProps extends React.ComponentProps<typeof ArtifactSpreadsheetEditor> {
  
}

function SheetEditor({ className, ...props }: SheetEditorProps) {
  return (
    <Suspense fallback={<PreviewLoading />}>
      <ArtifactSpreadsheetEditor
        className={className}
        {...props}
      />
    </Suspense>
  );
}
