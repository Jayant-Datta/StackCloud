"use client";

import { LogOut, Search, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Preview from "@/components/Preview";
import { formatDateTime, getFileSize } from "@/lib/utils";
import type { MockFile } from "./mockData";
import type { DemoView } from "./DemoSidebar";

const DemoHeader = ({
  files,
  onLogout,
  onUploadFiles,
  onNavigate,
}: {
  files: MockFile[];
  onLogout: () => void;
  onUploadFiles: (files: File[]) => void;
  onNavigate: (view: DemoView) => void;
}) => {
  const [searchText, setSearchText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const results = searchText
    ? files.filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
    : [];

  const handleSearchClick = (file: MockFile) => {
    const view: DemoView =
      file.type === "audio" || file.type === "video"
        ? "media"
        : file.type === "document"
        ? "documents"
        : file.type === "image"
        ? "images"
        : "others";
    onNavigate(view);
    setShowResults(false);
    setSearchText("");
  };

  const handleFilesPicked = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onUploadFiles(Array.from(fileList));
    toast.success(`${fileList.length} file(s) added (demo only, not really uploaded)`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-center justify-between px-7 mt-3">
      {/* Search */}
      <div className="w-[450px] h-12 relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="w-full h-full rounded-full bg-gray-100 border border-transparent px-12 text-base text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-froly focus:ring-1 focus:ring-froly shadow-none"
          placeholder="Search your file"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setShowResults(!!e.target.value);
          }}
        />

        {showResults && results.length > 0 && (
          <ul className="absolute top-14 left-0 w-full flex flex-col gap-1 bg-white shadow-xl border border-gray-100 p-2 rounded-2xl max-h-96 overflow-y-auto z-50">
            {results.map((item) => (
              <li
                key={item.$id}
                className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => handleSearchClick(item)}
              >
                <Preview
                  type={item.type}
                  extension={item.extension}
                  url={item.url}
                  imgClassNames="w-8 h-8"
                  classNames="w-12 h-12 flex-shrink-0"
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-gray-700 truncate">{item.name}</span>
                  <span className="text-gray-400 text-xs mt-0.5">
                    {getFileSize(item.size)} • {formatDateTime(item.$createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-4">
        {/* Upload */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilesPicked(e.target.files)}
          />
          <style>{`
            @keyframes button-shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            .animate-btn-shimmer {
              background-size: 200% 100%;
              animation: button-shimmer 3s linear infinite;
            }
          `}</style>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 h-12 px-6 rounded-full text-white text-sm font-bold cursor-pointer transition-all outline-none border-0
            bg-gradient-to-r from-[#e14e7a] via-[#ff8cae] to-[#e14e7a] animate-btn-shimmer
            shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-0.5"
          >
            <UploadCloud className="h-5 w-5" />
            <span className="tracking-wide">UPLOAD</span>
          </button>
        </div>

        <button
          type="button"
          className="cursor-pointer h-12 w-12 flex items-center justify-center bg-froly/10 hover:bg-froly/20 transition-colors rounded-full"
          onClick={onLogout}
        >
          <LogOut className="text-froly h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default DemoHeader;
