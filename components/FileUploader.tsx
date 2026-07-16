"use client"
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from './ui/button';
import { UploadCloud, X } from 'lucide-react';
import Preview from './Preview';
import { convertFileToUrl, getFileType } from '@/lib/utils';
import { MAX_FILE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/appwrite/file.action';
import { usePathname } from 'next/navigation';

const FileUploader = ({ownerId, accountId}: {ownerId: string; accountId: string}) => {

  const [files, setfiles] = useState<File[]>([])
  const path = usePathname()

  const handleFilterFiles = useCallback((fileName: string) => {
    const filteredFiles = files.filter((file) => file.name !== fileName);
    setfiles(filteredFiles);
  }, [files]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setfiles(acceptedFiles);

      const uploadedFiles = acceptedFiles.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          handleFilterFiles(file.name);

          toast.error(`Failed to upload ${file.name}`, {
            description: (
              <span className="text-black">
                <span className="font-semibold">
                  {file.name} is too large. Max file size is 50 MB.
                </span>
              </span>
            ),
          });

          return;
        }
        return uploadFile({ file, ownerId, accountId, path }).then( 
          (uploadedFile) => {
            if (uploadedFile) {
              handleFilterFiles(file.name);
            }
          },
        );
      });

      await Promise.all(uploadedFiles);
    },
    [accountId,handleFilterFiles,ownerId,path],
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    fileName: string,
  ) => {
    e.stopPropagation();
    handleFilterFiles(fileName);
  };

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      
      {/* 1. Added the inline style for the continuous shimmer animation */}
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

      {/* 2. Replaced the flat bg-froly with the gradient, glowing shadow, and hover lift */}
      <Button
        className="flex items-center gap-2 h-12 px-6 rounded-full text-white text-sm font-bold cursor-pointer transition-all outline-none border-0
        bg-gradient-to-r from-[#e14e7a] via-[#ff8cae] to-[#e14e7a] animate-btn-shimmer 
        shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-0.5"
      >
        <UploadCloud className="h-5 w-5" />
        <span className="tracking-wide">UPLOAD</span>
      </Button>

      {files.length > 0 && (
        <ul className="absolute right-0 top-16 bg-white w-96 shadow-xl border border-gray-100 p-4 rounded-2xl z-50">
          <span className="font-medium text-gray-600">Uploading</span>
          {files.map((file, index) => {
            const { type, extension } = getFileType(file.name);

            return (
              <li key={index}>
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Preview
                      type={type}
                      extension={extension}
                      url={convertFileToUrl(file)}
                      classNames="w-12 h-12"
                      imgClassNames="h-8 w-8"
                    />

                    <div className="flex flex-col">
                      <span className="w-60 truncate font-semibold text-slate-700 text-sm">{file.name}</span>
                      <iframe className="h-8 flex items-start justify-start w-48 -ml-2"
                        src="https://lottie.host/embed/75477686-8017-4d15-84d3-a2fabf6bb84f/oTtoB2FHYt.lottie">
                      </iframe>
                    </div>
                  </div>

                  <div
                    className="bg-slate-100 hover:bg-slate-200 transition-colors p-1.5 cursor-pointer rounded-full ml-auto"
                    onClick={(e) => handleRemoveFile(e, file.name)}
                  >
                    <X className="text-slate-500 w-4 h-4" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FileUploader;