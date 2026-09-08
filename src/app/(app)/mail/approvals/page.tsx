import { requirePageContext } from "@/lib/page-context";
import { ModuleStubPage } from "@/components/ui/module-stub";
import { CheckCircle2 } from "@/components/ui/icons";

export default async function MailApprovalsPage() {
  await requirePageContext();
  return <ModuleStubPage title="Mail Approvals" icon={CheckCircle2} />;
}
