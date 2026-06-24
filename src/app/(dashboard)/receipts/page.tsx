import { PageHeader } from "@/components/shared/page-header";
import { ReceiptUploader } from "@/features/receipts/receipt-uploader";

export default function ReceiptsPage() {
  return (
    <div>
      <PageHeader title="Receipt Scanner" subtitle="Upload, extract, review, and add receipt items into inventory." />
      <ReceiptUploader />
    </div>
  );
}
