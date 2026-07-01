import { FileCardProps } from "@/lib/types";
import { getFileSizeByType } from "@/lib/utils";
import Image from "next/image";

const FileCard = ({ id, bgColor, imgSrc, title, allFiles }: FileCardProps) => {
  const size = getFileSizeByType(allFiles, id)?.size;
  const createdAt = getFileSizeByType(allFiles, id)?.created;

  return (
    <div className="bg-white w-full rounded-2xl flex flex-col p-5 gap-4">
      
      {/* Top Row: Icon on the left, Size on the right */}
      <div className="flex items-center justify-between">
        <div className={`${bgColor} w-max rounded-full p-3 shadow-2xl`}>
          <Image
            width={25}
            height={25}
            src={imgSrc}
            alt="icon"
            className="invert"
          />
        </div>
        
        {/* MOVED THIS HERE */}
        <h2 className="text-sm font-medium">{size}</h2>
      </div>
      
      {/* Bottom Row: Title and Date */}
      <div>
        <p className="text-lg font-semibold text-black">{title}</p>
        <p className="text-sm text-gray-400">{createdAt || "-"}</p>
      </div>
      
    </div>
  );
};

export default FileCard;