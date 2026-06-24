import { PageHeader } from "@/components/shared/page-header";
import { ReceiptUploader } from "@/features/receipts/receipt-uploader";

export default function ReceiptsPage() {
  return (
    <div>
      <PageHeader title="Receipt Scanner / 小票扫描" subtitle="Take photo or upload from library, then review and import. / 拍照或从相册上传，确认后导入库存。" />
      <ReceiptUploader />
    </div>
  );
}
