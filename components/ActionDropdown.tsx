"use client"
import { Models } from 'node-appwrite'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { EllipsisVertical } from 'lucide-react';
import { ACTION_ITEMS } from '@/lib/constants';
import { constructDownloadUrl } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { ActionItem } from '@/lib/types';
import { Input } from './ui/input';
import ButtonLoading from './ButtonLoading';
import { usePathname } from 'next/navigation';
import { deleteFile, renameFile, shareFile } from '@/lib/appwrite/file.action';
import FileDetails from './FileDetails';
import Share from './Share';


  const ActionDropdown = ({ file }: { file: Models.DefaultRow }) => {

    const path = usePathname();
   
   const [isModelOpen, setIsModalOpen] = useState(false);
   const [isActionListOpen, setIsActionListOpen] = useState(false);
   const [actionItem, setActionItem] = useState<ActionItem | null>(null);
   const [fileName, setFileName] = useState(file.name);
   const [loading, setLoading] = useState(false);
   const [emails, setEmails] = useState([""])

  const handleCloseAllModals = () => {
  setIsModalOpen(false);
  setIsActionListOpen(false);
  setFileName(file.name);
  setActionItem(null);
  setEmails([""]);
  };

   const handleAction = async () => {
  if (!actionItem) {
    return;
  }

  setLoading(true);
  let success = false;

  const actions = {
   rename: () => {
      return renameFile({
        fileId: file.$id,
        name: fileName,
        extension: file.extension,
        path,
      });
},
    share: () => {
    return shareFile({
    fieldId: file.$id,
    emails,
    path,
    });
},
    delete: () => {
    return deleteFile({
    fileId: file.$id,
    bucketFileId: file.bucketFileId,
    path,
  });
},
  };

  success = await actions[actionItem.value as keyof typeof actions]();

  if (success) {
  handleCloseAllModals();
}

setLoading(false);

};

   const {label , value=""} = actionItem || {}

const renderDialogContent = () => {
  if (!isModelOpen) {
    return null;
  }

  return (
    <DialogContent className='rounded-2xl w-100'>
      <DialogHeader className='flex flex-col gap-4'>
        <DialogTitle className='text-center text-gray-600' >{label}</DialogTitle>
        {value === "rename" && (
        <Input
        type="text"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)} />
        )}

        {value === "details" && <FileDetails file={file}/>}

        {value === "share" && <Share file={file} onEmailChange={setEmails} />}

       {value === "delete" && (
      <p className="text-center text-gray-700">
       Are you sure you want to delete <span className="font-medium text-froly">{file.name}</span> ?
      </p>
       )}

       {["rename", "delete", "share"].includes(value) && (
       <DialogFooter className="flex items-center justify-between mt-2">
          <button className="cursor-pointer flex-1 h-11 rounded-full shadow " onClick={handleCloseAllModals}>
           Cancel
          </button>
          <ButtonLoading
          loading={loading}
          label={label}
          onClick={handleAction}
          classNames="rounded-full p-0 h-11 mt-0 flex-1"/>
      </DialogFooter>
)}

      </DialogHeader>
    </DialogContent>
  );
};


  return (
    <Dialog open={isModelOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isActionListOpen} onOpenChange={setIsActionListOpen}>
        <DropdownMenuTrigger>
          <EllipsisVertical className="text-gray-600" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-52 border-none rounded-xl">
          <DropdownMenuLabel className="text-base font-medium w-55 truncate">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

    <div>
        {ACTION_ITEMS.map((item) => {
        const {
        label,
        value,
        icon,
        iconColor,
        iconBgColor,
        } = item || {};

    return (
      <DropdownMenuItem
        key={value}
        className="text-base mt-2 cursor-pointer"
        onClick={() => {
          if(["rename", "share", "details", "delete"].includes(value)){
             setActionItem(item);
             setIsModalOpen(true);
          }
       
        }}
        >
        {value === "download" ? (
          <Link
            href={constructDownloadUrl(file.bucketFileId)}
            className="flex items-center gap-2 w-full">
            <div
             className={`${iconBgColor} w-8 h-8 flex items-center justify-center rounded-full`}>
                <Image
                          src={icon} 
                          alt={label} 
                          className={`${iconColor} w-5 h-5`} 
                          width={20} 
                          height={20} 
                        />
            </div>
            {label}
          </Link>

        ) : (
          <div className="w-full flex items-center gap-2">
            <div className={`${iconBgColor} w-8 h-8 flex items-center justify-center rounded-full`}>
                <Image 
                          src={icon} 
                          alt={label} 
                          className={`${iconColor} w-5 h-5`} 
                          width={20} 
                          height={20} 
                        />
            </div>
            {label}
         </div>
        )}
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


export default ActionDropdown