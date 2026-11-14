"use client";

import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Preview from "@/components/Preview";
import { FILE_CARDS } from "@/lib/constants";
import { formatDateTime, getFileSize, getFileType } from "@/lib/utils";
import { computeSizeByCategory } from "./mockData";
import type { MockFile } from "./mockData";
import DemoActionDropdown from "./DemoActionDropdown";

const DemoDashboard = ({
  files,
  fullName,
  onRename,
  onDelete,
}: {
  files: MockFile[];
  fullName: string;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
}) => {
  const recent = [...files]
    .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
    .slice(0, 7);

  return (
    <div className="px-8 pt-7 pb-6 h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-6 shrink-0">
        {FILE_CARDS.map((card) => {
          const { id, bgColor, imgSrc, title } = card || {};
          const { size, created } = computeSizeByCategory(files, id);

          return (
            <div key={id} className="bg-white w-full rounded-2xl flex flex-col p-5 gap-4">
              <div className="flex items-center justify-between">
                <div className={`${bgColor} w-max rounded-full p-3 shadow-2xl`}>
                  <Image width={25} height={25} src={imgSrc} alt="icon" className="invert" />
                </div>
                <h2 className="text-sm font-medium">{size}</h2>
              </div>
              <div>
                <p className="text-lg font-semibold text-black">{title}</p>
                <p className="text-sm text-gray-400">{created ? formatDateTime(created) : "-"}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col p-6 flex-1 min-h-0">
        <h2 className="text-gray-800 text-xl font-bold mb-4 shrink-0">Recently Modified</h2>

        <div className="relative flex-1 min-h-0 [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-y-auto [&>div]:overscroll-none [&>div]:no-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
              <TableRow className="border-b-0 hover:bg-white">
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">NAME</TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">
                  LAST MODIFIED
                </TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">SIZE</TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase text-right">
                  TYPE
                </TableHead>
                <TableHead className="text-right text-gray-400 text-sm font-semibold flex justify-end items-center">
                  <ArrowDown className="h-4 w-4" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-10">
                    No files yet — try uploading something from the header.
                  </TableCell>
                </TableRow>
              )}
              {recent.map((file) => (
                <TableRow key={file.$id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-medium flex items-center gap-4 py-4">
                    <Preview
                      type={file.type}
                      extension={file.extension}
                      url={file.url}
                      classNames="w-10 h-10"
                      imgClassNames="w-6 h-6"
                    />
                    <span className="font-medium text-gray-700">{file.name}</span>
                  </TableCell>
                  <TableCell className="text-gray-600 font-medium py-4">
                    {formatDateTime(file.$updatedAt)}
                  </TableCell>
                  <TableCell className="text-gray-600 font-medium py-4">{getFileSize(file.size)}</TableCell>
                  <TableCell className="text-right text-gray-600 font-medium capitalize py-4">
                    {getFileType(file.name).type}
                  </TableCell>
                  <TableCell className="flex justify-end text-gray-600 font-medium cursor-pointer py-4">
                    <DemoActionDropdown file={file} ownerName={fullName} onRename={onRename} onDelete={onDelete} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DemoDashboard;
