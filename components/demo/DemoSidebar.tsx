"use client";

import { SIDEBAR_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Aperture } from "lucide-react";
import Image from "next/image";
import Progress from "@/components/Progress";
import Profile from "@/public/profile.png";

export type DemoView = "dashboard" | "documents" | "images" | "media" | "others";

const urlToView = (url: string): DemoView =>
  (url === "/" ? "dashboard" : url.slice(1)) as DemoView;

const DemoSidebar = ({
  fullName,
  fileSize,
  activeView,
  onNavigate,
}: {
  fullName: string;
  fileSize: number;
  activeView: DemoView;
  onNavigate: (view: DemoView) => void;
}) => {
  const MAX_SPACE = 2 * 1024 * 1024 * 1024;
  const usagePercentage = (fileSize / MAX_SPACE) * 100;
  const sizeInGB = (fileSize / (1024 * 1024 * 1024)).toFixed(2);
  const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
  const displaySize = fileSize > 1024 * 1024 * 1024 ? `${sizeInGB} GB` : `${sizeInMB} MB`;

  return (
    <aside className="w-66 flex flex-col h-full bg-white pt-8 pb-8">
      {/* Logo */}
      <div className="flex items-center justify-start gap-3 px-10 shrink-0">
        <div className="bg-gradient-to-tr from-[#e14e7a] to-[#ff8cae] p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
          <Aperture className="w-7 h-7 text-white stroke-[2.5px] animate-[spin_10s_linear_infinite]" />
        </div>
        <span className="text-2xl font-bold text-gray-800 tracking-tight">
          Lumina<span className="text-froly">.</span>
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col flex-1 mt-8 gap-2 overflow-y-auto no-scrollbar">
        {SIDEBAR_ITEMS.map((sidebar) => {
          const { name, icon: Icon, url } = sidebar || {};
          const view = urlToView(url);
          const isActive = activeView === view;

          const bgClass = isActive
            ? "bg-froly/15"
            : "hover:bg-gray-200 transition-colors duration-200";
          const textClass = isActive
            ? "text-[#C24A5E] font-semibold"
            : "text-gray-700 hover:text-gray-900";
          const iconColorClass = isActive ? "bg-[#C24A5E]" : "bg-gray-700 opacity-70";
          const iconUrl = typeof Icon === "string" ? Icon : Icon?.src;

          return (
            <button
              key={url}
              type="button"
              onClick={() => onNavigate(view)}
              className={cn(
                "flex items-center justify-start gap-3 cursor-pointer py-3 mx-4 px-6 rounded-full text-left",
                bgClass,
              )}
            >
              <div
                className={cn("w-5 h-5", iconColorClass)}
                style={{
                  maskImage: `url(${iconUrl})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: `url(${iconUrl})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                }}
              />
              <span className={cn(textClass)}>{name}</span>
            </button>
          );
        })}
      </div>

      {/* Storage + profile */}
      <div className="flex flex-col gap-4 mx-6 mt-auto shrink-0">
        <div className="bg-froly flex flex-col px-4 pt-2 pb-4 rounded-md">
          <span className="text-white font-medium">Storage</span>
          <span className="text-sm text-white">{displaySize} of 2GB</span>
          <Progress Percentage={usagePercentage} />
        </div>

        <div className="flex items-center gap-3">
          <Image src={Profile} width={40} height={40} alt="USER_Icon" className="rounded-full" />
          <span className="font-medium text-black">{fullName}</span>
        </div>
      </div>
    </aside>
  );
};

export default DemoSidebar;
