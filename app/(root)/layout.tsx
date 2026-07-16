import { Toaster } from "@/components/ui/sonner"
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";
import { getTotalSpaceUsed } from "@/lib/appwrite/file.action";

export const metadata: Metadata = {
  title: "Lumina",
  description: "Store like a Pro",
};

const Layout = async ({ children }: { children: React.ReactNode }) => {
  
  const user = await getCurrentUser();
   
  if(!user){
    redirect("/auth");
  }
 
  const totalSpaceInBytes = await getTotalSpaceUsed();

  return (
    // Added overflow-hidden to the main wrapper as an ultimate safeguard
    <main className="flex h-screen bg-white overflow-hidden">
      <Sidebar fullName={user?.fullName} fileSize={totalSpaceInBytes}/>

      <section className="flex h-screen flex-1 flex-col min-h-0">
        <Header ownerId={user.$id} accountId={user.accountid} />
        
        {/* FIXED: Removed h-[648px]. Added flex-1, overflow-hidden, flex, flex-col, and min-h-0 */}
        <div className="bg-gray-100 shadow m-3 rounded-2xl flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>
      </section>

      <Toaster/>
    </main>
  );
};

export default Layout;