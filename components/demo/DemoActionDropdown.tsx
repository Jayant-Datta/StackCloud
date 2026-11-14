"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ACTION_ITEMS } from "@/lib/constants";
import { formatDateTime, getFileSize } from "@/lib/utils";
import FilePreview from "@/components/FilePreview";
import CustomInput from "@/components/CustomInput";
import { Mail } from "lucide-react";
import type { MockFile } from "./mockData";

const DemoActionDropdown = ({
  file,
  ownerName,
  onRename,
  onDelete,
}: {
  file: MockFile;
  ownerName: string;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionListOpen, setIsActionListOpen] = useState(false);
  const [actionItem, setActionItem] = useState<{ label: string; value: string } | null>(null);
  const [fileName, setFileName] = useState(file.name);
  const [emails, setEmails] = useState([""]);

  const handleCloseAllModals = () => {
    setIsModalOpen(false);
    setIsActionListOpen(false);
    setFileName(file.name);
    setActionItem(null);
    setEmails([""]);
  };

  const handleAction = () => {
    if (!actionItem) return;

    if (actionItem.value === "rename") {
      onRename(file.$id, fileName);
      toast.success(`Renamed to "${fileName}"`);
    } else if (actionItem.value === "share") {
      toast.success(`Shared with ${emails.filter(Boolean).join(", ") || "no one yet"} (demo only)`);
    } else if (actionItem.value === "delete") {
      onDelete(file.$id);
      toast.success(`Deleted "${file.name}"`);
    }

    handleCloseAllModals();
  };

  const { label, value = "" } = actionItem || {};

  const renderDetailItem = (itemLabel: string, itemValue: string | number) => (
    <div className="mt-4 flex gap-6">
      <span className="text-gray-500 font-medium w-24">{itemLabel}:</span>
      <span className="font-medium text-gray-800">{itemValue}</span>
    </div>
  );

  const renderDialogContent = () => {
    if (!isModalOpen) return null;

    return (
      <DialogContent className="rounded-2xl w-100">
        <DialogHeader className="flex flex-col gap-4">
          <DialogTitle className="text-center text-gray-800 font-sans text-xl font-semibold capitalize">
            {label}
          </DialogTitle>

          {value === "rename" && (
            <Input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          )}

          {value === "details" && (
            <div className="flex flex-col gap-2">
              <FilePreview file={file as unknown as Parameters<typeof FilePreview>[0]["file"]} />
              <div className="bg-gray-50 p-4 rounded-xl mt-2 border border-gray-100">
                {renderDetailItem("Type", file.extension)}
                {renderDetailItem("Size", getFileSize(file.size))}
                {renderDetailItem("Creator", ownerName)}
                {renderDetailItem("Created", formatDateTime(file.$createdAt))}
                {renderDetailItem("Modified", formatDateTime(file.$updatedAt))}
              </div>
            </div>
          )}

          {value === "share" && (
            <div>
              <FilePreview file={file as unknown as Parameters<typeof FilePreview>[0]["file"]} />
              <div className="flex items-center justify-center mt-4">
                <span>Share file with other users</span>
              </div>
              <CustomInput
                Icon={Mail}
                labelTitle="Email"
                labelHtmlFor="email"
                onChange={(e) => setEmails(e.target.value.trim().split(","))}
                inputName="shareEmail"
                classNames="mt-3"
              />
            </div>
          )}

          {value === "delete" && (
            <p className="text-center text-gray-600 font-sans">
              Are you sure you want to delete{" "}
              <span className="font-medium text-froly">{file.name}</span>?
            </p>
          )}

          {["rename", "delete", "share"].includes(value) && (
            <DialogFooter className="flex items-center justify-between mt-2 gap-4">
              <button
                className="cursor-pointer flex-1 h-11 rounded-full shadow border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                onClick={handleCloseAllModals}
              >
                Cancel
              </button>
              <button
                className="cursor-pointer flex-1 h-11 rounded-full bg-froly text-white font-medium hover:bg-froly/90 transition-colors capitalize"
                onClick={handleAction}
              >
                {label}
              </button>
            </DialogFooter>
          )}
        </DialogHeader>
      </DialogContent>
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isActionListOpen} onOpenChange={setIsActionListOpen}>
        <DropdownMenuTrigger
          className="p-1.5 rounded-full hover:bg-gray-200 cursor-pointer transition-all outline-none flex items-center justify-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <EllipsisVertical className="text-gray-600" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-52 border-none rounded-xl shadow-lg p-2">
          <DropdownMenuLabel className="text-base font-medium w-55 truncate normal-case text-gray-800">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div>
            {ACTION_ITEMS.map((item) => {
              const { label: itemLabel, value: itemValue, icon, iconColor, iconBgColor } = item || {};

              return (
                <DropdownMenuItem
                  key={itemValue}
                  className="text-sm mt-1 cursor-pointer rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (itemValue === "download") {
                      toast.message("Demo mode — download is disabled.");
                      return;
                    }
                    setActionItem(item);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="w-full flex items-center gap-3">
                    <div className={`${iconBgColor} w-8 h-8 flex items-center justify-center rounded-full`}>
                      <Image src={icon} alt={itemLabel} className={`${iconColor} w-4 h-4`} width={16} height={16} />
                    </div>
                    <span className="capitalize font-medium text-gray-700">{itemLabel}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {renderDialogContent()}
    </Dialog>
  );
};

export default DemoActionDropdown;
