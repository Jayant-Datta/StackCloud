"use client";

import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import LuminaSidebar from "@/components/LuminaSidebar";
import { convertFileToUrl, getFileType } from "@/lib/utils";
import DemoAuth from "./DemoAuth";
import DemoSidebar, { type DemoView } from "./DemoSidebar";
import DemoHeader from "./DemoHeader";
import DemoDashboard from "./DemoDashboard";
import DemoTypeView from "./DemoTypeView";
import { INITIAL_MOCK_FILES, MOCK_USER, type MockFile } from "./mockData";

type Screen = "landing" | DemoView;

const WebsiteDemo = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [files, setFiles] = useState<MockFile[]>(INITIAL_MOCK_FILES);

  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  const handleRename = (fileId: string, newName: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.$id === fileId ? { ...file, name: newName, $updatedAt: new Date().toISOString() } : file,
      ),
    );
  };

  const handleDelete = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.$id !== fileId));
  };

  const handleUploadFiles = (uploaded: File[]) => {
    const now = new Date().toISOString();
    const newEntries: MockFile[] = uploaded.map((file, index) => {
      const { type, extension } = getFileType(file.name);
      return {
        $id: `upload-${Date.now()}-${index}`,
        name: file.name,
        type: type as MockFile["type"],
        extension,
        size: file.size,
        url: convertFileToUrl(file),
        bucketFileId: `upload-${Date.now()}-${index}`,
        $createdAt: now,
        $updatedAt: now,
      };
    });
    setFiles((prev) => [...newEntries, ...prev]);
  };

  if (screen === "landing") {
    return (
      <div className="h-screen flex font-sans">
        <LuminaSidebar />
        <section className="bg-white flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
          <div className="relative z-10 w-full max-w-md px-4">
            <DemoAuth onEnter={() => setScreen("dashboard")} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-white overflow-hidden">
      <DemoSidebar
        fullName={MOCK_USER.fullName}
        fileSize={totalBytes}
        activeView={screen}
        onNavigate={setScreen}
      />

      <section className="flex h-screen flex-1 flex-col min-h-0">
        <DemoHeader
          files={files}
          onLogout={() => setScreen("landing")}
          onUploadFiles={handleUploadFiles}
          onNavigate={setScreen}
        />

        <div className="bg-gray-100 shadow m-3 rounded-2xl flex-1 overflow-hidden flex flex-col min-h-0">
          {screen === "dashboard" ? (
            <DemoDashboard
              files={files}
              fullName={MOCK_USER.fullName}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ) : (
            <DemoTypeView
              view={screen}
              files={files}
              fullName={MOCK_USER.fullName}
              onRename={handleRename}
              onDelete={handleDelete}
              onFilesAdded={handleUploadFiles}
            />
          )}
        </div>
      </section>

      <Toaster />
    </main>
  );
};

export default WebsiteDemo;
