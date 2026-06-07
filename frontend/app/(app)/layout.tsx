"use client";

import { Guard } from "@/components/Guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Guard>{children}</Guard>;
}
