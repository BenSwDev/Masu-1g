import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth/require-session";
import { getProfessionals } from "@/actions/professional-actions";
import { ProfessionalManagement } from "@/components/dashboard/admin/professional-management/professional-management";
import { ScrollArea } from "@/components/common/ui/scroll-area";
import { Separator } from "@/components/common/ui/separator";
import { Heading } from "@/components/common/ui/heading";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

interface AdminProfessionalsPageProps {
  searchParams: { page?: string; search?: string };
}

export default async function AdminProfessionalsPage({
  searchParams,
}: AdminProfessionalsPageProps) {
  const session = await requireUserSession();
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard");
  }

  const page = Number.parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  const result = await getProfessionals(page, 10, search);

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading
          icon={Briefcase}
          titleKey="admin.professionals.title"
          descriptionKey="admin.professionals.description"
        />
        <Separator />
        {result.success && (
          <ProfessionalManagement
            initialProfessionals={result.professionals}
            totalPages={result.totalPages}
            currentPage={page}
            initialSearch={search}
          />
        )}
      </div>
    </ScrollArea>
  );
}
