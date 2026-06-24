import { PageHeader } from "@/components/shared/page-header";
import { AssistantChat } from "@/features/ai/assistant-chat";

export default function AssistantPage() {
  return (
    <div>
      <PageHeader title="AI Food Assistant" subtitle="Inventory-aware responses for meal planning, expiry checks, and shopping support." />
      <AssistantChat />
    </div>
  );
}
