"use client";

import { useState } from "react";
import { Models } from "node-appwrite";
import { Sparkles } from "lucide-react";
import { cn, getSummarizableKind, isSummarizableFile } from "@/lib/utils";
import SummarizeModal, { useFileSummary } from "./SummarizeModal";

type SummarizeButtonProps = {
  file: Models.DefaultRow;
  variant?: "table" | "card";
  className?: string;
};

const SummarizeButton = ({
  file,
  variant = "table",
  className,
}: SummarizeButtonProps) => {
  const [open, setOpen] = useState(false);
  const {
    completion,
    isLoading,
    isCached,
    error,
    startSummary,
    regenerate,
    abortSummary,
  } = useFileSummary(file.$id, file.$updatedAt);

  if (!isSummarizableFile(file.extension, file.name)) {
    return null;
  }

  const isMedia = getSummarizableKind(file.extension, file.name) === "media";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    startSummary();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={
          isMedia
            ? `Identify song or summarize ${file.name}`
            : `Summarize ${file.name}`
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium transition-all cursor-pointer shrink-0",
          "bg-pink-50 text-[#e14e7a] border border-pink-100 hover:bg-pink-100/80 hover:border-pink-200",
          variant === "table" && "px-3 py-1.5 text-xs",
          variant === "card" && "px-2.5 py-1 text-[11px]",
          className
        )}
      >
        <Sparkles className={cn(variant === "table" ? "w-3.5 h-3.5" : "w-3 h-3")} />
        <span>Summarize</span>
      </button>

      <SummarizeModal
        file={file}
        open={open}
        onOpenChange={setOpen}
        completion={completion}
        isLoading={isLoading}
        isCached={isCached}
        error={error}
        onRegenerate={regenerate}
        onAbort={abortSummary}
      />
    </>
  );
};

export default SummarizeButton;

