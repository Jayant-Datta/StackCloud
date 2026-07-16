"use client"
import FileCard from "@/components/FileCard";
import { getFiles } from "@/lib/appwrite/file.action";
import { FILE_CARDS } from "@/lib/constants";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Preview from "@/components/Preview";
import { Models } from "node-appwrite";
import { ArrowDown } from "lucide-react";
import { formatDateTime, getFileSize, getFileType } from "@/lib/utils";
import ActionDropdown from "@/components/ActionDropdown";

const Dashboard = () => {
  const [allFiles, setAllFiles] = useState<Models.DefaultRow[]>([]);
  
  const handleFetchFiles = async () => {
    const filesData = await getFiles({ types: [], query: "" });
    setAllFiles(filesData.rows);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    handleFetchFiles();
  }, []);

  return (
    // 1. Added overflow-hidden and pb-6 to the root to strictly prevent outer scrolling while leaving a bottom gap.
    <div className="px-8 pt-7 pb-6 h-full flex flex-col min-h-0 overflow-hidden">
      
      {/* 2. Added shrink-0 so the top cards never get crushed on small screens */}
      <div className="flex items-center justify-between gap-6 shrink-0">
        {FILE_CARDS.map((card) => {
          const { id, bgColor, imgSrc, title } = card || {};
          return (
            <FileCard
              key={card.id}
              id={id}
              bgColor={bgColor}
              imgSrc={imgSrc}
              title={title}
              allFiles={allFiles}
            />
          );
        })}
      </div>
      
      {/* 3. Made the white card flex-1 and min-h-0 so it dynamically fills exactly the rest of the screen, no more, no less. */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col p-6 flex-1 min-h-0">
        <h2 className="text-gray-800 text-xl font-bold mb-4 shrink-0">Recently Modified</h2>
        
        {/* 4. Removed max-h-[400px]. Used flex-1 min-h-0 on the wrapper, and absolute inset-0 on the internal shadcn div. */}
        {/* This forces the scrollable table to perfectly fit inside the remaining space of the white card. */}
        <div className="relative flex-1 min-h-0 [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-y-auto [&>div]:overscroll-none [&>div]:no-scrollbar">
          <Table>
            
            <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
              <TableRow className="border-b-0 hover:bg-white">
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">
                  NAME
                </TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">
                  LAST MODIFIED
                </TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase">
                  SIZE
                </TableHead>
                <TableHead className="text-gray-400 text-sm font-semibold tracking-wide uppercase text-right">
                  TYPE
                </TableHead>
                <TableHead className="text-right text-gray-400 text-sm font-semibold flex justify-end items-center">
                  <ArrowDown className="h-4 w-4" />
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {[...allFiles]
                .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
                .slice(0, 7)
                .map((file: Models.DefaultRow) => {
                  return (
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
                      <TableCell className="text-gray-600 font-medium py-4">
                        {getFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600 font-medium capitalize py-4">
                        {getFileType(file.name).type}
                      </TableCell>
                      <TableCell className="flex justify-end text-gray-600 font-medium cursor-pointer py-4">
                        <ActionDropdown file={file} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;