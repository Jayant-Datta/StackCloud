"use client";

import { useCallback, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Models } from "node-appwrite";
import {
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import FilePreview from "./FilePreview";
import { cn, getSummarizableKind } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "lumina:summary:";
const MAX_CACHED_SUMMARIES = 50;
const completedSummaryKeys = new Set<string>();

type StoredSummaryEntry = {
  summary: string;
  ts: number;
};

function readCachedSummary(cacheKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSummaryEntry>;
    if (typeof parsed?.summary === "string" && parsed.summary.trim().length > 0) {
      return parsed.summary;
    }
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${cacheKey}`);
  } catch {
    // Ignore storage read/parse failures
  }
  return null;
}

function writeCachedSummary(cacheKey: string, summary: string) {
  if (typeof window === "undefined" || !summary.trim()) return;
  try {
    const entries: Array<{ key: string; ts: number }> = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const storageKey = window.localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(STORAGE_KEY_PREFIX)) continue;
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as Partial<StoredSummaryEntry>) : null;
        entries.push({
          key: storageKey,
          ts: typeof parsed?.ts === "number" ? parsed.ts : 0,
        });
      } catch {
        entries.push({ key: storageKey, ts: 0 });
      }
    }

    if (entries.length >= MAX_CACHED_SUMMARIES) {
      entries.sort((a, b) => a.ts - b.ts);
      const excess = entries.length - MAX_CACHED_SUMMARIES + 1;
      for (let i = 0; i < excess; i++) {
        window.localStorage.removeItem(entries[i].key);
      }
    }

    const payload: StoredSummaryEntry = {
      summary,
      ts: Date.now(),
    };
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${cacheKey}`,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage quota/availability failures
  }
}

function deleteCachedSummary(cacheKey: string) {
  completedSummaryKeys.delete(cacheKey);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${cacheKey}`);
  } catch {
    // Ignore storage failures
  }
}

function extractErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    // Message is already plain text
  }
  return error.message || "Failed to generate summary. Please try again.";
}

export function useFileSummary(fileId: string, updatedAt?: string) {
  const cacheKey = updatedAt ? `${fileId}:${updatedAt}` : fileId;
  const [isCached, setIsCached] = useState(false);

  const { completion, complete, isLoading, error, stop, setCompletion } =
    useCompletion({
      api: "/api/summarize",
      id: `summarize-${cacheKey}`,
      onFinish: (_prompt, text) => {
        const trimmed = text.trim();
        if (trimmed.length > 0) {
          completedSummaryKeys.add(cacheKey);
          writeCachedSummary(cacheKey, trimmed);
        }
      },
      onError: (err) => {
        deleteCachedSummary(cacheKey);
        setIsCached(false);
        toast.error(extractErrorMessage(err));
      },
    });

  const startSummary = useCallback(() => {
    if (isLoading) return;

    if (completedSummaryKeys.has(cacheKey) && completion && !error) {
      setIsCached(true);
      return;
    }

    const stored = readCachedSummary(cacheKey);
    if (stored) {
      completedSummaryKeys.add(cacheKey);
      setCompletion(stored);
      setIsCached(true);
      return;
    }

    deleteCachedSummary(cacheKey);
    setIsCached(false);
    setCompletion("");
    void complete("", { body: { fileId } });
  }, [cacheKey, complete, completion, error, fileId, isLoading, setCompletion]);

  const regenerate = useCallback(() => {
    if (isLoading) return;
    deleteCachedSummary(cacheKey);
    setIsCached(false);
    setCompletion("");
    void complete("", { body: { fileId, force: true } });
  }, [cacheKey, complete, fileId, isLoading, setCompletion]);

  const abortSummary = useCallback(() => {
    if (isLoading) {
      completedSummaryKeys.delete(cacheKey);
      stop();
    }
  }, [cacheKey, isLoading, stop]);

  return {
    completion,
    isLoading,
    isCached,
    error,
    startSummary,
    regenerate,
    abortSummary,
  };
}

type SummarizeModalProps = {
  file: Models.DefaultRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completion: string;
  isLoading: boolean;
  isCached?: boolean;
  error: Error | undefined;
  onRegenerate: () => void;
  onAbort: () => void;
};

const SummarizeModal = ({
  file,
  open,
  onOpenChange,
  completion,
  isLoading,
  isCached = false,
  error,
  onRegenerate,
  onAbort,
}: SummarizeModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onAbort();
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const handleCopy = async () => {
    if (!completion) return;
    try {
      await navigator.clipboard.writeText(completion);
      setCopied(true);
      toast.success("Summary copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  const errorMessage = error && !isCached ? extractErrorMessage(error) : null;
  const isMedia = getSummarizableKind(file.extension, file.name) === "media";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="rounded-2xl sm:max-w-lg border border-slate-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pink-50 text-[#e14e7a] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-sans text-lg font-semibold text-gray-800 normal-case tracking-normal">
                {isMedia ? "AI Media Summary" : "AI Document Summary"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0">
                {isMedia
                  ? "Quick track & clip identification from your media file"
                  : "3-sentence overview streamed live from your file"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <FilePreview file={file} />

        <div className="rounded-xl border border-gray-200/80 bg-gray-50/80 p-4 flex flex-col gap-3 min-h-[136px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Summary
              </span>
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-50 text-[#e14e7a] text-[11px] font-medium border border-pink-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e14e7a] animate-pulse" />
                  Streaming
                </span>
              ) : isCached && completion ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-100">
                  <Zap className="w-3 h-3" />
                  Instant cached
                </span>
              ) : null}
            </div>

            {completion && !isLoading && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                title="Copy summary"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          {errorMessage && !isLoading ? (
            <div className="flex items-start gap-2.5 text-sm text-rose-600 bg-rose-50/80 border border-rose-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-2">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="self-start text-xs font-semibold text-rose-700 hover:text-rose-800 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : isLoading && !completion ? (
            <div className="flex flex-col gap-2.5 py-1" aria-live="polite">
              <div className="h-3.5 w-full rounded bg-slate-200/80 animate-pulse" />
              <div className="h-3.5 w-11/12 rounded bg-slate-200/80 animate-pulse" />
              <div className="h-3.5 w-4/5 rounded bg-slate-200/80 animate-pulse" />
              <span className="text-xs text-slate-400 mt-1">
                {isMedia
                  ? "Listening to media to identify song or content..."
                  : "Reading document and generating summary..."}
              </span>
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap"
              aria-live="polite"
            >
              {completion}
              {isLoading && (
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#e14e7a] animate-pulse rounded-xs" />
              )}
            </p>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 sm:justify-between">
          <button
            type="button"
            disabled={isLoading}
            onClick={onRegenerate}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Regenerate
          </button>

          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-froly hover:bg-froly/90 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            {isLoading ? "Stop & Close" : "Done"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SummarizeModal;
