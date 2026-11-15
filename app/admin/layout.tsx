import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guest dashboard · Danica & Jesthony",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative z-[1] min-h-[100svh]">{children}</div>;
}
