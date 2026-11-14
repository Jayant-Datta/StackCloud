"use client";

import { Calendar, User } from "lucide-react";
import { toast } from "sonner";
import Preview from "@/components/Preview";
import { formatDateTime, getFileSize } from "@/lib/utils";
import DemoActionDropdown from "./DemoActionDropdown";
import type { MockFile } from "./mockData";

const DemoCard = ({
  file,
  fullName,
  onRename,
  onDelete,
}: {
  file: MockFile;
  fullName: string;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
}) => {
  return (
    <div
      onClick={() => toast.message("Demo mode — file preview isn't wired up.")}
      className="group relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-[0_12px_30px_-10px_rgba(225,78,122,0.2)] hover:border-pink-200 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col w-[260px] h-[260px]"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="relative w-12 h-12 rounded-2xl bg-pink-50/50 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-rose-500 group-hover:text-white transition-all duration-300 shadow-sm overflow-hidden shrink-0">
          <Preview
            type={file.type}
            extension={file.extension}
            url={file.url}
            classNames="w-8 h-8"
            imgClassNames="w-full h-full object-cover !rounded-none"
          />
        </div>

        <div
          className="text-slate-300 hover:text-[#e14e7a] p-1 rounded-xl hover:bg-pink-50 transition-colors relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <DemoActionDropdown file={file} ownerName={fullName} onRename={onRename} onDelete={onDelete} />
        </div>
      </div>

      <div className="mb-4 flex-1">
        <h4
          className="font-bold text-slate-800 text-[15px] truncate group-hover:text-[#e14e7a] transition-colors"
          title={file.name}
        >
          {file.name}
        </h4>

        <span className="inline-block mt-2 px-2 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-100 group-hover:bg-pink-50 group-hover:text-[#e14e7a] group-hover:border-pink-100 transition-colors">
          {getFileSize(file.size)}
        </span>
      </div>

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

export default DemoCard;
