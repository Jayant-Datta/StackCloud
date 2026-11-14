import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Lumina — Demo",
  description: "Frontend-only preview of Lumina, no backend required",
};

const DemoLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default DemoLayout;
