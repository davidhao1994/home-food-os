"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUiStore } from "@/store/ui-store";
import { formatCategoryLabel } from "@/utils/food";

type ReceiptWorkflowStatus = "UPLOADED" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";

type MergeStrategy = "MERGE" | "CREATE_NEW";

type DuplicateCandidate = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  storageLocation: string;
  expirationDate: string | null;
};

type OcrItem = {
  id: string;
  rawLine: string | null;
  extractedName: string;
  rawName?: string;
  normalizedName?: string;
  displayName?: string;
  displayNameZh?: string;
  possibleNameHint?: string;
  possibleNameHintZh?: string;
  aliases?: string[];
  needsReview?: boolean;
  normalizationConfidence?: number;
  isFood?: boolean;
  extractedQuantity: number | null;
  extractedUnit: string | null;
  extractedPrice: number | null;
  confidence: number | null;
  lineStatus: "EXTRACTED" | "CONFIRMED" | "REJECTED";
  suggestedCategory: string;
  suggestedStorageLocation: string;
  suggestedExpirationDate: string | null;
  duplicateCandidates: DuplicateCandidate[];
  defaultAction: MergeStrategy;
  defaultMergeTargetId: string | null;
  mergeStrategy?: MergeStrategy;
  existingInventoryItemId?: string | null;
};

type ReceiptStatusPayload = {
  receiptUploadId: string;
  status: ReceiptWorkflowStatus;
  retailer: string;
  ocrResults: OcrItem[];
  error?: string;
};

type ReceiptCorrectionStore = Record<
  string,
  {
    displayName: string;
    displayNameZh?: string;
    category?: string;
  }
>;

const RECEIPT_CORRECTIONS_STORAGE_KEY = "home-food-os-receipt-corrections-v1";

const TERMINAL_STATUSES: ReceiptWorkflowStatus[] = ["REVIEW_REQUIRED", "COMPLETED", "FAILED"];

function statusMessage(status: ReceiptWorkflowStatus) {
  if (status === "UPLOADED") {
    return "Receipt uploaded. OCR will start shortly.";
  }

  if (status === "PROCESSING") {
    return "Extracting receipt items. This may take up to 15 seconds.";
  }

  if (status === "REVIEW_REQUIRED") {
    return "OCR completed. Review the extracted lines before adding them to inventory.";
  }

  if (status === "COMPLETED") {
    return "Receipt processing completed.";
  }

  return "OCR failed. Please retry with a clearer image.";
}

function formatSuggestedDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString();
}

function tr(language: "en" | "zh", en: string, zh: string) {
  return language === "zh" ? zh : en;
}

function getPrimaryName(language: "en" | "zh", line: OcrItem) {
  if (line.needsReview) {
    if (language === "zh") {
      return line.possibleNameHintZh || line.displayNameZh || line.possibleNameHint || line.displayName || line.extractedName;
    }

    return line.possibleNameHint || line.displayName || line.extractedName;
  }

  if (language === "zh") {
    return line.displayNameZh || line.displayName || line.extractedName;
  }

  return line.displayName || line.extractedName;
}

export function ReceiptUploader() {
  const language = useUiStore((state) => state.language);
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [receiptUploadId, setReceiptUploadId] = useState("");
  const [retailer, setRetailer] = useState("unknown");
  const [results, setResults] = useState<OcrItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const [workflowStatus, setWorkflowStatus] = useState<ReceiptWorkflowStatus | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [hasAddedToInventory, setHasAddedToInventory] = useState(false);
  const [corrections, setCorrections] = useState<ReceiptCorrectionStore>({});
  const [isMobile, setIsMobile] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoPromptedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldAutoLaunchCamera = searchParams.get("capture") === "1";

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = localStorage.getItem(RECEIPT_CORRECTIONS_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ReceiptCorrectionStore;
      setCorrections(parsed);
    } catch {
      setCorrections({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(RECEIPT_CORRECTIONS_STORAGE_KEY, JSON.stringify(corrections));
  }, [corrections]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMobile = () => setIsMobile(mediaQuery.matches);
    syncMobile();
    mediaQuery.addEventListener("change", syncMobile);

    return () => {
      mediaQuery.removeEventListener("change", syncMobile);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !shouldAutoLaunchCamera || hasAutoPromptedRef.current) {
      return;
    }

    hasAutoPromptedRef.current = true;
    cameraInputRef.current?.click();
  }, [isMobile, shouldAutoLaunchCamera]);

  const mergeSelectedIds = (nextResults: OcrItem[]) => {
    setSelectedIds((current) => {
      if (current.length > 0) {
        return current.filter((id) => nextResults.some((line) => line.id === id && line.lineStatus !== "REJECTED"));
      }

      return nextResults.filter((line) => line.lineStatus !== "REJECTED").map((line) => line.id);
    });
  };

  const applyReceiptPayload = (payload: ReceiptStatusPayload) => {
    const nextStatus = payload.status;
    const nextResults = (payload.ocrResults ?? []).map((line) => {
      const correctionKey = (line.rawName ?? line.rawLine ?? line.extractedName ?? "").trim().toLowerCase();
      const learned = correctionKey ? corrections[correctionKey] : undefined;

      return {
        ...line,
        extractedName: learned?.displayName ?? line.extractedName,
        displayName: learned?.displayName ?? line.displayName,
        displayNameZh: learned?.displayNameZh ?? line.displayNameZh,
        isFood: line.isFood ?? true,
        suggestedCategory: learned?.category ?? line.suggestedCategory,
        mergeStrategy: line.mergeStrategy ?? line.defaultAction,
        existingInventoryItemId: line.existingInventoryItemId ?? line.defaultMergeTargetId ?? null
      };
    });
    setReceiptUploadId(payload.receiptUploadId);
    setWorkflowStatus(nextStatus);
    setRetailer(payload.retailer ?? "unknown");
    setResults(nextResults);
    mergeSelectedIds(nextResults);

    if (nextStatus === "FAILED") {
      setStatusTone("error");
      setStatus(payload.error ?? "OCR failed. Please retry with a clearer image.");
      stopPolling();
      return;
    }

    setStatusTone("info");
    setStatus(statusMessage(nextStatus));

    if (TERMINAL_STATUSES.includes(nextStatus)) {
      stopPolling();
    }
  };

  const pollReceiptStatus = async (nextReceiptUploadId: string) => {
    const response = await fetch(`/api/receipts/${nextReceiptUploadId}`);

    if (!response.ok) {
      setWorkflowStatus("FAILED");
      setStatusTone("error");
      setStatus("Unable to fetch receipt OCR status.");
      stopPolling();
      return;
    }

    const payload = (await response.json()) as ReceiptStatusPayload;
    applyReceiptPayload(payload);
  };

  const startPolling = (nextReceiptUploadId: string) => {
    stopPolling();
    void pollReceiptStatus(nextReceiptUploadId);
    pollTimerRef.current = setInterval(() => {
      void pollReceiptStatus(nextReceiptUploadId);
    }, 2_500);
  };

  const toBase64 = (nextFile: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result ?? "");
        const encoded = value.includes(",") ? value.split(",")[1] : "";
        if (!encoded) {
          reject(new Error("Unable to read receipt image."));
          return;
        }

        resolve(encoded);
      };
      reader.onerror = () => reject(new Error("Unable to read receipt image."));
      reader.readAsDataURL(nextFile);
    });

  const processReceiptFile = async (nextFile: File) => {
    setFile(nextFile);
    if (hasAddedToInventory) {
      setHasAddedToInventory(false);
    }

    if (!nextFile) {
      setStatus("Choose a receipt image first.");
      return;
    }

    stopPolling();
    setIsUploading(true);
    setWorkflowStatus("");
    setReceiptUploadId("");
    setRetailer("unknown");
    setResults([]);
    setSelectedIds([]);
    setHasAddedToInventory(false);
    setStatusTone("info");
    setStatus("Uploading receipt...");

    let imageData = "";
    try {
      imageData = await toBase64(nextFile);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Unable to read receipt image.");
      setIsUploading(false);
      return;
    }

    const response = await fetch("/api/receipts/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: nextFile.name, mimeType: nextFile.type })
    });

    if (!response.ok) {
      setStatusTone("error");
      setStatus("Unable to upload this receipt right now.");
      setWorkflowStatus("FAILED");
      setIsUploading(false);
      return;
    }

    const data = (await response.json()) as { receiptUploadId: string; status: ReceiptWorkflowStatus };
    const nextReceiptUploadId = data.receiptUploadId;
    setReceiptUploadId(nextReceiptUploadId);
    setWorkflowStatus(data.status ?? "UPLOADED");
    setStatusTone("info");
    setStatus(statusMessage(data.status ?? "UPLOADED"));
    startPolling(nextReceiptUploadId);

    setStatusTone("info");
    setStatus("Receipt uploaded. OCR started.");
    setWorkflowStatus("PROCESSING");

    void (async () => {
      const processResponse = await fetch("/api/receipts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptUploadId: nextReceiptUploadId,
          imageData
        })
      });

      const payload = (await processResponse.json()) as ReceiptStatusPayload;
      applyReceiptPayload(payload);

      if (!processResponse.ok) {
        setWorkflowStatus("FAILED");
        setStatusTone("error");
        setStatus(payload.error ?? "Receipt OCR failed. Please retry with a clearer image.");
      }
    })().catch(() => {
      setWorkflowStatus("FAILED");
      setStatusTone("error");
      setStatus("Receipt OCR failed. Please retry with a clearer image.");
      stopPolling();
    });

    setIsUploading(false);
  };

  const addSelectedToInventory = async () => {
    if (hasAddedToInventory || isSubmittingSelection) {
      return;
    }

    if (!receiptUploadId || selectedIds.length === 0) {
      setStatusTone("error");
      setStatus("Select at least one extracted item to add into inventory.");
      return;
    }

    setIsSubmittingSelection(true);

    try {
      const response = await fetch("/api/receipts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptUploadId,
          reviewedLines: results.map((line) => ({
            id: line.id,
            selected: selectedIds.includes(line.id),
            isFood: line.isFood ?? true,
            extractedName: line.extractedName,
            normalizedName: line.normalizedName ?? null,
            displayName: line.displayName ?? null,
            displayNameZh: line.displayNameZh ?? null,
            needsReview: line.needsReview ?? false,
            extractedQuantity: line.extractedQuantity,
            extractedUnit: line.extractedUnit,
            extractedPrice: line.extractedPrice,
            mergeStrategy: line.mergeStrategy ?? line.defaultAction,
            existingInventoryItemId: line.existingInventoryItemId ?? line.defaultMergeTargetId ?? null
          }))
        })
      });

      if (!response.ok) {
        setStatusTone("error");
        setStatus("Unable to add the selected receipt items into inventory.");
        return;
      }

      const data = (await response.json()) as {
        addedCount: number;
        createdCount: number;
        mergedCount: number;
        alreadyProcessed?: boolean;
      };
      if (data.alreadyProcessed) {
        setStatusTone("success");
        setStatus("Already imported");
        setHasAddedToInventory(true);
        setWorkflowStatus("COMPLETED");
        return;
      }

      setStatusTone("success");
      setStatus(`✓ Added ${data.addedCount} items to inventory`);
      setHasAddedToInventory(true);
      setWorkflowStatus("COMPLETED");

      if (receiptUploadId) {
        void pollReceiptStatus(receiptUploadId);
      }
    } catch {
      setStatusTone("error");
      setStatus("Unable to add the selected receipt items into inventory.");
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const updateLine = (id: string, updater: (line: OcrItem) => OcrItem) => {
    setResults((current) => current.map((line) => (line.id === id ? updater(line) : line)));
  };

  const rejectLine = (id: string, markNotFood = false) => {
    updateLine(id, (current) => ({
      ...current,
      lineStatus: "REJECTED",
      isFood: markNotFood ? false : current.isFood,
      mergeStrategy: "CREATE_NEW",
      existingInventoryItemId: null
    }));
    setSelectedIds((current) => current.filter((value) => value !== id));
  };

  const saveCorrection = (line: OcrItem) => {
    const key = (line.rawName ?? line.rawLine ?? line.extractedName).trim().toLowerCase();
    if (!key) {
      return;
    }

    setCorrections((current) => ({
      ...current,
      [key]: {
        displayName: line.extractedName.trim() || line.extractedName,
        displayNameZh: line.displayNameZh,
        category: line.suggestedCategory
      }
    }));
  };

  const canReview = workflowStatus === "REVIEW_REQUIRED" || workflowStatus === "COMPLETED";
  const disableAddButton = hasAddedToInventory || isSubmittingSelection || selectedIds.length === 0;
  const duplicateCount = results.filter((line) => line.duplicateCandidates.length > 0).length;
  const needsReviewItems = results.filter((line) => line.needsReview && line.lineStatus !== "REJECTED");
  const readyItems = results.filter((line) => !line.needsReview && line.lineStatus !== "REJECTED");
  const ignoredItems = results.filter((line) => line.lineStatus === "REJECTED");
  const launchCamera = () => cameraInputRef.current?.click();
  const launchLibrary = () => libraryInputRef.current?.click();

  const onFilePicked = (nextFile: File | null) => {
    if (!nextFile) {
      return;
    }

    setFile(nextFile);
    void processReceiptFile(nextFile);
  };

  const markSelectedIgnored = () => {
    if (selectedIds.length === 0) {
      return;
    }

    const idsToIgnore = new Set(selectedIds);

    setResults((current) =>
      current.map((line) =>
        idsToIgnore.has(line.id)
          ? {
              ...line,
              lineStatus: "REJECTED",
              mergeStrategy: "CREATE_NEW",
              existingInventoryItemId: null
            }
          : line
      )
    );

    setSelectedIds((current) => current.filter((id) => !idsToIgnore.has(id)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{tr(language, "Scan a receipt into today's inventory", "扫描小票并加入今日库存")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
              className="hidden"
            />

            <div className="grid gap-2 md:grid-cols-2">
              <Button className="h-11 w-full" type="button" onClick={launchCamera} disabled={isUploading || workflowStatus === "PROCESSING"}>
                {isUploading || workflowStatus === "PROCESSING" ? tr(language, "Extracting...", "识别中...") : tr(language, "Take Photo", "拍照")}
              </Button>
              <Button className="h-11 w-full" type="button" variant="secondary" onClick={launchLibrary} disabled={isUploading || workflowStatus === "PROCESSING"}>
                {tr(language, "Upload from Library", "从相册上传")}
              </Button>
            </div>

            {isMobile && shouldAutoLaunchCamera ? (
              <p className="text-xs text-muted-foreground">{tr(language, "Camera opened automatically. You can still choose Upload from Library.", "已自动打开相机，你仍可选择从相册上传。")}</p>
            ) : null}
            {file ? <p className="text-xs text-muted-foreground">{tr(language, "Selected file:", "已选择文件：")} {file.name}</p> : null}
            {workflowStatus ? <p className="text-xs font-medium text-muted-foreground">{tr(language, "Current status:", "当前状态：")} {workflowStatus}</p> : null}

            {status ? (
              <p
                className={
                  statusTone === "error"
                    ? "rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
                    : statusTone === "success"
                      ? "rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
                      : "rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                }
                role={statusTone === "error" ? "alert" : "status"}
              >
                {status}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">{tr(language, "Supported first: Costco, Walmart, and Safeway receipts.", "当前优先支持：Costco、Walmart、Safeway 小票。")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr(language, "OCR Results", "识别结果")} ({retailer})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {results.length === 0 ? <p className="text-muted-foreground">{tr(language, "No OCR results yet.", "暂无识别结果。")}</p> : null}
          {results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/20 p-3 text-xs md:grid-cols-4">
                <div>
                  <p className="font-medium uppercase tracking-wide text-muted-foreground">{tr(language, "Ready to Import", "可直接导入")}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{readyItems.length}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-muted-foreground">{tr(language, "Needs Review", "需要确认")}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{needsReviewItems.length}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-muted-foreground">{tr(language, "Ignored", "已忽略")}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{ignoredItems.length}</p>
                </div>
                <div>
                  <p className="font-medium uppercase tracking-wide text-muted-foreground">{tr(language, "Duplicates", "重复项")}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{duplicateCount}</p>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <Button type="button" variant="secondary" onClick={() => setSelectedIds(readyItems.map((line) => line.id))}>
                  {tr(language, "Import all confident items", "导入全部高置信度项")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedIds(needsReviewItems.map((line) => line.id))}>
                  {tr(language, "Review only uncertain items", "仅查看低置信度项")}
                </Button>
                <Button type="button" variant="outline" onClick={markSelectedIgnored}>
                  {tr(language, "Ignore selected", "忽略所选")}
                </Button>
              </div>

              <div className="space-y-3 md:hidden">
                {results.map((line) => (
                  <div key={line.id} className="rounded-2xl border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(line.id)}
                          onChange={() => toggleSelected(line.id)}
                          aria-label={`Include ${line.extractedName}`}
                        />
                        {tr(language, "Include item", "包含此项")}
                      </label>
                      <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                          {line.confidence != null ? `${Math.round(line.confidence * 100)}% ${tr(language, "confidence", "置信度")}` : tr(language, "No confidence", "无置信度")}
                        </span>
                        {line.needsReview ? <span className="rounded-full bg-warning/15 px-2 py-1 text-warning">{tr(language, "Needs Review", "需要确认")}</span> : null}
                        {line.lineStatus === "REJECTED" ? <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{tr(language, "Ignored", "已忽略")}</span> : null}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="rounded-xl border bg-muted/20 px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">{getPrimaryName(language, line)}</p>
                        {line.needsReview ? <p className="mt-1 text-xs text-warning">{tr(language, "Possible item - needs review", "可能是该食材，需要确认")}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{tr(language, "Original receipt text:", "小票原文：")} {line.rawName ?? line.rawLine ?? "N/A"}</p>
                      </div>
                      <label className="text-xs text-muted-foreground">{tr(language, "Item name", "食材名称")}</label>
                      <input
                        value={line.extractedName}
                        onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled={!canReview}
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">{tr(language, "Qty", "数量")}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.extractedQuantity ?? ""}
                            onChange={(event) =>
                              updateLine(line.id, (current) => ({
                                ...current,
                                extractedQuantity: event.target.value ? Number(event.target.value) : null
                              }))
                            }
                            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            disabled={!canReview}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{tr(language, "Unit", "单位")}</label>
                          <input
                            value={line.extractedUnit ?? ""}
                            onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))}
                            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            disabled={!canReview}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{tr(language, "Price", "价格")}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.extractedPrice ?? ""}
                            onChange={(event) =>
                              updateLine(line.id, (current) => ({
                                ...current,
                                extractedPrice: event.target.value ? Number(event.target.value) : null
                              }))
                            }
                            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            disabled={!canReview}
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        <p>{tr(language, "Suggested:", "建议：")} {formatCategoryLabel(line.suggestedCategory)} • {formatCategoryLabel(line.suggestedStorageLocation)}</p>
                        <p className="mt-1">{tr(language, "Suggested expiration:", "建议保质期：")} {formatSuggestedDate(line.suggestedExpirationDate)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <p className="text-xs font-medium">{tr(language, "Status:", "状态：")} {line.lineStatus}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => saveCorrection(line)}>
                          {tr(language, "This is correct", "这项正确")}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => rejectLine(line.id)}>
                          {tr(language, "Ignore item", "忽略此项")}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => rejectLine(line.id, true)}>
                          {tr(language, "Not food", "非食材")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full min-w-[880px] border-collapse">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{tr(language, "Include", "包含")}</th>
                      <th className="px-3 py-2">{tr(language, "Item Name", "食材名称")}</th>
                      <th className="px-3 py-2">{tr(language, "Quantity", "数量")}</th>
                      <th className="px-3 py-2">{tr(language, "Unit", "单位")}</th>
                      <th className="px-3 py-2">{tr(language, "Price", "价格")}</th>
                      <th className="px-3 py-2">{tr(language, "Confidence", "置信度")}</th>
                      <th className="px-3 py-2">{tr(language, "Status", "状态")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((line) => (
                      <tr key={line.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selectedIds.includes(line.id)} onChange={() => toggleSelected(line.id)} />
                        </td>
                        <td className="px-3 py-2">
                          <p className="mb-1 text-xs font-medium text-foreground">{getPrimaryName(language, line)}</p>
                          {line.needsReview ? <p className="mb-1 text-xs text-warning">{tr(language, "Possible item - needs review", "可能是该食材，需要确认")}</p> : null}
                          <input
                            value={line.extractedName}
                            onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            disabled={!canReview}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">{tr(language, "Original receipt text:", "小票原文：")} {line.rawName ?? line.rawLine ?? "N/A"}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => saveCorrection(line)}>
                              {tr(language, "This is correct", "这项正确")}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => rejectLine(line.id)}>
                              {tr(language, "Ignore item", "忽略此项")}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => rejectLine(line.id, true)}>
                              {tr(language, "Not food", "非食材")}
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={line.extractedQuantity ?? ""} onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedQuantity: event.target.value ? Number(event.target.value) : null }))} className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm" disabled={!canReview} />
                        </td>
                        <td className="px-3 py-2">
                          <input value={line.extractedUnit ?? ""} onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))} className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm" disabled={!canReview} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={line.extractedPrice ?? ""} onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedPrice: event.target.value ? Number(event.target.value) : null }))} className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm" disabled={!canReview} />
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{line.confidence != null ? line.confidence.toFixed(2) : "N/A"}</td>
                        <td className="px-3 py-2 text-xs font-medium">{line.lineStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {results.length > 0 && canReview ? (
            <div className="sticky bottom-[max(env(safe-area-inset-bottom),0px)] z-20 flex flex-col gap-2 rounded-xl border bg-card/95 p-2 pt-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:flex-row">
              <Button className="w-full md:w-auto" variant="secondary" type="button" onClick={() => setSelectedIds(results.filter((line) => line.lineStatus !== "REJECTED").map((line) => line.id))}>
                {tr(language, "Select All", "全选")}
              </Button>
              <Button className="w-full md:w-auto" variant="outline" type="button" onClick={() => setSelectedIds([])}>
                {tr(language, "Clear Selection", "清空选择")}
              </Button>
              <Button className={hasAddedToInventory ? "w-full bg-success text-success-foreground md:w-auto" : "w-full md:w-auto"} type="button" onClick={addSelectedToInventory} disabled={disableAddButton} aria-label="Add selected items to inventory">
                {hasAddedToInventory ? tr(language, "Completed", "已完成") : isSubmittingSelection ? tr(language, "Adding...", "添加中...") : tr(language, "Add Selected to Inventory", "将所选添加到库存")}
              </Button>
              {hasAddedToInventory ? (
                <Button className="w-full md:w-auto" type="button" variant="outline" asChild>
                  <Link href="/inventory" aria-label={tr(language, "View inventory", "查看库存")}>{tr(language, "View Inventory", "查看库存")}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
