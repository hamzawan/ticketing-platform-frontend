import type { Metadata } from "next";
import { Figtree, DM_Sans } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-display",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Big Bounce America · Ticketing Platform",
  description: "Organizer portal for the Big Bounce America ticketing platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
