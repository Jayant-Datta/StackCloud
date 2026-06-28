"use client"
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Layers} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Progress from "./Progress";
import Profile from '../public/profile.png'
const Sidebar = ({
  fullName,
  fileSize,
}: {
  fullName: string;
  fileSize: string;
}) => {
    
    const pathname = usePathname()

  return (
    <aside className="w-66 pt-8 bg-white pb-38">
      <div className="flex items-center justify-start gap-3 px-10">
        <Layers className="w-10 h-10 text-froly" />
        <span className="font-medium text-froly text-xl">StackCloud</span>
      </div>

      <div className="flex flex-col mt-8 gap-4 h-[85%]">
  {SIDEBAR_ITEMS.map((sidebar) => {
    const { name, icon: Icon, url } = sidebar || {};
    const bgClass = pathname === url ? "bg-froly" : "";
    const textClass = pathname === url ? "text-white" : "text-gray-700"; 
    const iconFilterClass = pathname === url ? "invert brightness-200" : "";
    return (
      <Link
        className={cn(`flex items-center justify-start gap-3 cursor-pointer py-3 mx-6 px-4 rounded-md`,bgClass)}
        key={url}
        href={url}
      >
        <Image 
                src={Icon} 
                alt={`${name} icon`} 
                width={20} 
                height={20} 
                className={cn("object-contain w-5 h-5", iconFilterClass)}
              />
        <span className={cn("font-medium", textClass)}>{name}</span>
      </Link>
    );
  })}
</div>

    <div className="flex flex-col gap-4 mx-6">
        <div className=" bg-froly flex flex-col px-4 pt-2 pb-4 rounded-md">
            <span className="text-white font-medium ">Storage</span>
            <span className="text-sm text-white ">{fileSize} of 6GB</span>
            <Progress Percentage={50} />
        </div>

        <div className="flex items-center gap-3">
            <Image src={Profile} width={40} height={40}  alt="USER_Icon"  className="rounded-full" />
            <span className="font-medium text-black" >{fullName}</span>
        </div>
      
    </div>
    </aside>
  );
};

export default Sidebar;