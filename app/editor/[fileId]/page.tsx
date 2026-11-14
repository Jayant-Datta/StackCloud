import React from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { getFileById, getFileTextContent } from "@/lib/appwrite/file.action";
import CollabEditor from "@/components/collab/CollabEditor";
import { Toaster } from "@/components/ui/sonner";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fileId } = await params;
  const file = await getFileById(fileId);
  return {
    title: file?.name ? `${file.name} — Lumina Editor` : "Lumina AI Co-Editor",
    description: "Real-time collaborative code editor powered by Yjs CRDTs and Lumina AI",
  };
}

export default async function EditorPage({ params }: PageProps) {
  const { fileId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth");
  }

  const file = await getFileById(fileId);
  if (!file) {
    notFound();
  }

  // Permission check: owner or shared user
  const isOwner = file.ownerId === currentUser.$id;
  const isShared = Array.isArray(file.users) && file.users.includes(currentUser.email);
  if (!isOwner && !isShared) {
    redirect("/");
  }

  const initialContent = await getFileTextContent(file.bucketFileId);

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-slate-900 text-slate-100">
      <CollabEditor
        file={file}
        initialContent={initialContent || ""}
        currentUser={{
          $id: currentUser.$id,
          fullName: currentUser.fullName || currentUser.name || "Collaborator",
          email: currentUser.email || "",
        }}
      />
      <Toaster />
    </main>
  );
}

