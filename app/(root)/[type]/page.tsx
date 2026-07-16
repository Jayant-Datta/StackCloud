import Card from "@/components/Card";
import Filter from "@/components/Filter";
import { getFiles } from "@/lib/appwrite/file.action";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { getFileTypeParams, getTotalFileSize } from "@/lib/utils";
import { Models } from "node-appwrite";
import { FolderOpen } from "lucide-react"; 
import LuminaEmptyState from "@/components/LuminaEmptyState";

const Page = async ({
  searchParams,
  params,
}: {
  searchParams: Promise<{ query: string; filter: string }>;
  params: Promise<{ type: string }>;
}) => {
   const type = ((await params)?.type as string) || "";
   const query = ((await searchParams)?.query as string) || "";
   const filter = ((await searchParams)?.filter as string) || "";

   const currentUser = await getCurrentUser();
   const fileType = getFileTypeParams(type);

   const files = await getFiles({ types: fileType, query, filter });

   const totalsize= getTotalFileSize(files?.rows)
  
  return (
  // FIXED: Changed to h-full, used py-4 instead of mt-4, added gap-4
  <div className="flex flex-col h-full px-4 py-4 gap-4">
    
    {/* FIXED: Added shrink-0 so the header never gets squished when files fill the screen */}
    <div className="flex justify-between shrink-0">
      <span className="font-semibold text-2xl capitalize">{type}</span>
      <Filter/>
    </div>
  
    {/* FIXED: Added shrink-0 */}
    <span className="shrink-0">Total {totalsize} </span>

    {/* FIXED: Removed h-[560px]. Added flex-1, min-h-0, content-start, and pb-4 */}
    <div className="flex-1 flex flex-wrap gap-4.5 overflow-y-scroll no-scrollbar content-start pb-4 min-h-0">
      
      {files?.rows?.length > 0 ? (
        files?.rows?.map((file: Models.DefaultRow) => {
          return <Card key={file.$id} file={file} fullName={currentUser.fullName} />
        })
      ) : (
        /* 2. Render the new Client Component here, passing the 'type' string */
        <div className="w-full">
           <LuminaEmptyState 
              type={type} 
              ownerId={currentUser.$id} 
              accountId={currentUser.accountid} 
            />
        </div>
      )}

    </div>
  </div>
   );
};

export default Page;