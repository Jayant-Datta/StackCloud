// sidebar
// header

import { Toaster } from "@/components/ui/sonner"
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export const metadata: Metadata = {
  title: "StackCloud",
  description: "Store like a Pro",
};

const Layout = async ({ children }: { children: React.ReactNode }) => {
  
  const user = await getCurrentUser();
   
  if(!user){
    redirect("/auth");
  }
 
  

  return (
    <main className="flex h-screen bg-white">
    {/* TODO pass fullname of the user and filesize from the appwrite */}
      <Sidebar fullName={user?.fullName} fileSize="52.2"/>

      <section className="flex h-full flex-1 flex-col">
        <Header ownerId={user.$id} accountId={user.accountid} />
        <div className="bg-gray-50 shadow m-4 h-full rounded-2xl">
          {children}
        </div>
      </section>

      <Toaster/>
    </main>
  );
};

export default Layout;