"use client"
import { signOutuser } from "@/lib/appwrite/user.action";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import FileUploader from "./FileUploader";
import FileSearch from "./FileSearch";

const Header = ({ownerId, accountId}: {ownerId: string; accountId: string}) => {

  const router =useRouter();  
  const handleLogout = async () => {
    try {
    await signOutuser();
      
      router.push("/auth");

    }  catch(error){
      console.log("Logout failed:",error);
    }
};
  

  return (
    <div className="flex items-center justify-between px-7 mt-3">
      {/* Search */}
      <FileSearch/>
      <div className="flex gap-4">
        <FileUploader ownerId={ownerId} accountId={accountId} />
        <button
          // Added a smooth hover transition to deepen the background color
          className="cursor-pointer h-12 w-12 flex items-center justify-center bg-froly/10 hover:bg-froly/20 transition-colors rounded-full"
          onClick={handleLogout}
        >
          <LogOut className="text-froly h-5 w-5" /> {/* Removed rotate-180 if it was facing the wrong way, adjust if needed! */}
        </button>
      </div>
    </div>
  );
};

export default Header;