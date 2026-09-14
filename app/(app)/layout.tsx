import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { NavBar } from "@/components/nav-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { legalName: true },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar companyName={company?.legalName ?? "Ledger"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <NavBar user={{ name: session.user.name, email: session.user.email }} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
