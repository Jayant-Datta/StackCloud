import { Models } from "node-appwrite";
import Preview from "./Preview";
import { formatDateTime, getFileSize } from "@/lib/utils";

const FilePreview = ({ file }: { file: Models.DefaultRow }) => {
  return (
    <div className="border border-gray-300 rounded-xl p-3 flex gap-2 items-center">
      <Preview
        type={file.type}
        extension={file.extension}
        url={file.url}
        imgClassNames="w-10 h-10"
        classNames="w-15 h-15"
      />

      <div className="flex flex-col gap-0.5">
        <span className="text-gray-600 font-medium truncate w-[16rem]">
          {file.name}
        </span>
        <span className="font-medium text-gray-600 text-sm">
          {getFileSize(file.size)} {formatDateTime(file.$createdAt)}
        </span>
      </div>
    </div>
  );
};

export default FilePreview;