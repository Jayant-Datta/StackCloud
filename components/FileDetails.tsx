"use client"
import { Models } from "node-appwrite";
import FilePreview from "./FilePreview";
import { cn, formatDateTime, getFileSize } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { getFileOwnerDetails } from "@/lib/appwrite/file.action";

const FileDetails = ({ file }: { file: Models.DefaultRow }) => {
  const [ownerFullName, setOwnerFullName] = useState("");

  const handleFetchOwnerDetails = useCallback(async () => {
    const user = await getFileOwnerDetails(file.ownerId);
    setOwnerFullName(user.fullName);
  }, [file.ownerId]);

  const renderItem = (label: string, value: string | number) => {
    // 1. Removed the upperCaseClass logic entirely
    return (
      <div className="mt-4 flex gap-6">
        <span className="text-gray-500 font-medium w-24">{label}:</span>
        {/* 2. Used normal font styling */}
        <span className="font-medium text-gray-800">{value}</span>
      </div>
    );
  };

  useEffect(() => {
    handleFetchOwnerDetails();
  }, [handleFetchOwnerDetails]);

  return (
    <div className="flex flex-col gap-2">
      <FilePreview file={file} />
      <div className="bg-gray-50 p-4 rounded-xl mt-2 border border-gray-100">
        {renderItem("Type", file.extension)}
        {renderItem("Size", getFileSize(file.size))}
        {renderItem("Creator", ownerFullName)}
        {renderItem("Created", formatDateTime(file.$createdAt))}
        {renderItem("Modified", formatDateTime(file.$updatedAt))}
      </div>
    </div>
  );
};

export default FileDetails;