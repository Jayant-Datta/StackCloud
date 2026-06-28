import { getFiles } from "@/lib/appwrite/file.action";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { getFileTypeParams } from "@/lib/utils";

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

   console.log("files:", files)
  

  return <div>{type}</div>;
};

export default Page;