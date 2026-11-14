"use client";

import { useRouter } from "next/navigation";
import { Models } from "node-appwrite";
import Preview from "./Preview";
import { formatDateTime, getFileSize, isEditableFile } from "@/lib/utils";
import ActionDropdown from "./ActionDropdown";
import SummarizeButton from "./SummarizeButton";
import { Calendar, Code2, User } from "lucide-react";

const Card = ({
  file,
  fullName,
}: {
  file: Models.DefaultRow;
  fullName: string;
}) => {
  const router = useRouter();
  const isEditable = isEditableFile(file.extension, file.name);

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked inside an interactive element, let the child handle it
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("[data-radix-collection-item]")
    ) {
      return;
    }

    if (isEditable) {
      router.push(`/editor/${file.$id}`);
    } else if (file.url) {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isEditable) {
        router.push(`/editor/${file.$id}`);
      } else if (file.url) {
        window.open(file.url, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      // The main card container matching your HTML's shadow, border, and hover lift
      className="group relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-[0_12px_30px_-10px_rgba(225,78,122,0.2)] hover:border-pink-200 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col w-[260px] h-[260px] focus:outline-none focus:ring-2 focus:ring-pink-300"
    >
      {/* Top section: Icon Container & Action Menu */}
      <div className="flex justify-between items-start mb-4">
        {/* The Animated Icon Box (Rounded Square) */}
        <div className="relative w-12 h-12 rounded-2xl bg-pink-50/50 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-rose-500 group-hover:text-white transition-all duration-300 shadow-sm overflow-hidden shrink-0">
          <Preview 
            type={file.type} 
            extension={file.extension} 
            url={file.url} 
            classNames="w-8 h-8"
            // Important: We use !rounded-none to override any circular masking inside your Preview component, letting the parent's rounded-2xl handle the shape
            imgClassNames="w-full h-full object-cover !rounded-none" 
          />
        </div>

        {/* Action Dropdown (3 dots) - Cleanly anchored in the top right */}
        <div
          className="text-slate-400 hover:text-[#e14e7a] p-1.5 -mr-1.5 -mt-1 rounded-xl hover:bg-pink-50 transition-colors relative z-20 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <ActionDropdown file={file} />
        </div>
      </div>

      {/* Middle section: File Name & Action Badges */}
      <div className="mb-4 flex-1 flex flex-col justify-start">
        <h4 
          className="font-bold text-slate-800 text-[15px] truncate group-hover:text-[#e14e7a] transition-colors"
          title={file.name}
        >
          {file.name}
        </h4>
        
        {/* Badges & Actions Row */}
        <div
          className="flex items-center flex-wrap gap-2 mt-2.5 relative z-20"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Size Pill */}
          <span className="inline-block px-2.5 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-100 group-hover:bg-pink-50/70 group-hover:text-[#e14e7a] group-hover:border-pink-100 transition-colors shrink-0">
            {getFileSize(file.size)}
          </span>

          {/* Edit with AI Button (for editable code & text files) */}
          {isEditable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/editor/${file.$id}`);
              }}
              title={`Edit ${file.name} with Lumina AI`}
              className="inline-flex items-center gap-1.5 rounded-full font-medium transition-all cursor-pointer shrink-0 bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100/90 hover:border-violet-200 px-2.5 py-1 text-[11px] shadow-2xs"
            >
              <Code2 className="w-3 h-3 text-violet-600" />
              <span>Edit</span>
            </button>
          )}

          {/* Summarize Button */}
          <SummarizeButton file={file} variant="card" />
        </div>
      </div>

      {/* Bottom section: Metadata with the top divider */}
      <div className="pt-4 border-t border-slate-50 flex flex-col gap-2 text-[12px] font-medium text-slate-400 mt-auto">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="truncate">{formatDateTime(file.$createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="truncate">By: {fullName}</span>
        </div>
      </div>
    </div>
  );
};

export default Card;