import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AiChatWidget } from "@/components/ai-assistant/chat-widget";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const { locale } = await params;
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">{children}</main>
      </div>
      <AiChatWidget />
    </div>
  );
}
