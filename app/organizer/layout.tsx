import { OrganizerSidebar } from "@/components/organizer/sidebar";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-background lg:overflow-hidden">
      <OrganizerSidebar />
      <main className="flex-1 lg:overflow-y-auto">{children}</main>
    </div>
  );
}
