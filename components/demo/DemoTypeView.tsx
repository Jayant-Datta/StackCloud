"use client";

import { useMemo, useState } from "react";
import DemoCard from "./DemoCard";
import DemoFilter from "./DemoFilter";
import DemoEmptyState from "./DemoEmptyState";
import { computeTotalSize, type MockFile } from "./mockData";
import type { DemoView } from "./DemoSidebar";

const VIEW_TO_TYPES: Record<Exclude<DemoView, "dashboard">, MockFile["type"][]> = {
  documents: ["document"],
  images: ["image"],
  media: ["audio", "video"],
  others: ["other"],
};

const DemoTypeView = ({
  view,
  files,
  fullName,
  onRename,
  onDelete,
  onFilesAdded,
}: {
  view: Exclude<DemoView, "dashboard">;
  files: MockFile[];
  fullName: string;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onFilesAdded: (files: File[]) => void;
}) => {
  const [sort, setSort] = useState("name-asc");

  const filtered = useMemo(() => {
    const allowedTypes = VIEW_TO_TYPES[view];
    const list = files.filter((file) => allowedTypes.includes(file.type));

    const [key, direction] = sort.split("-") as [string, "asc" | "desc"];
    const sorted = [...list].sort((a, b) => {
      let compare = 0;
      if (key === "name") compare = a.name.localeCompare(b.name);
      else if (key === "size") compare = a.size - b.size;
      else if (key === "$createdAt") compare = new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
      return direction === "desc" ? -compare : compare;
    });
    return sorted;
  }, [files, view, sort]);

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-4">
      <div className="flex justify-between shrink-0">
        <span className="font-semibold text-2xl capitalize">{view}</span>
        <DemoFilter onSort={setSort} />
      </div>

      <span className="shrink-0">Total {computeTotalSize(filtered)}</span>

      <div className="flex-1 flex flex-wrap gap-4.5 overflow-y-scroll no-scrollbar content-start pb-4 min-h-0">
        {filtered.length > 0 ? (
          filtered.map((file) => (
            <DemoCard key={file.$id} file={file} fullName={fullName} onRename={onRename} onDelete={onDelete} />
          ))
        ) : (
          <div className="w-full">
            <DemoEmptyState type={view} onFilesAdded={onFilesAdded} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoTypeView;
