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
  aliases?: string[];
  needsReview?: boolean;
  normalizationConfidence?: number;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    fileInputRef.current?.click();
  }, [isMobile, shouldAutoLaunchCamera]);

  const mergeSelectedIds = (nextResults: OcrItem[]) => {
    setSelectedIds((current) => {
      if (current.length > 0) {
        return current.filter((id) => nextResults.some((line) => line.id === id));
      }

      return nextResults.map((line) => line.id);
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setStatus("Choose a receipt image first.");
      return;
    }

    await processReceiptFile(file);
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
            extractedName: line.extractedName,
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

  const setMergeChoice = (id: string, strategy: MergeStrategy, existingInventoryItemId: string | null) => {
    updateLine(id, (current) => ({
      ...current,
      mergeStrategy: strategy,
      existingInventoryItemId
    }));
  };

  const canReview = workflowStatus === "REVIEW_REQUIRED" || workflowStatus === "COMPLETED";
  const disableAddButton = hasAddedToInventory || isSubmittingSelection || selectedIds.length === 0;
  const duplicateCount = results.filter((line) => line.duplicateCandidates.length > 0).length;
  const launchCamera = () => fileInputRef.current?.click();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan a receipt into today&apos;s inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                if (nextFile && isMobile) {
                  void processReceiptFile(nextFile);
                }
              }}
              className="hidden md:block md:w-full md:rounded-md md:border md:border-input md:bg-background md:px-3 md:py-2 md:text-sm"
            />
            <Button className="w-full md:hidden" type="button" onClick={launchCamera} disabled={isUploading || workflowStatus === "PROCESSING"}>
              {isUploading || workflowStatus === "PROCESSING" ? "Extracting..." : "Open Camera"}
            </Button>
            {!isMobile ? (
              <Button className="w-full md:w-auto" type="submit" disabled={isUploading || workflowStatus === "PROCESSING"}>
                {isUploading || workflowStatus === "PROCESSING" ? "Extracting..." : "Extract Items"}
              </Button>
            ) : null}
            {workflowStatus ? <p className="text-xs font-medium text-muted-foreground">Current status: {workflowStatus}</p> : null}
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
            <p className="text-xs text-muted-foreground">Supported first: Costco, Walmart, and Safeway receipts.</p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OCR Results ({retailer})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {results.length === 0 ? <p className="text-muted-foreground">No OCR results yet.</p> : null}
          {results.length > 0 ? (
            <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/20 p-3 text-xs md:grid-cols-4">
              <div>
                <p className="font-medium uppercase tracking-wide text-muted-foreground">Lines</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{results.length}</p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wide text-muted-foreground">Selected</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{selectedIds.length}</p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wide text-muted-foreground">Duplicates</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{duplicateCount}</p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wide text-muted-foreground">Mode</p>
                <p className="mt-1 text-sm font-medium text-foreground">Review before save</p>
              </div>
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
                      Include item
                    </label>
                    <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                      <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                        {line.confidence != null ? `${Math.round(line.confidence * 100)}% confidence` : "No confidence"}
                      </span>
                      {line.needsReview ? <span className="rounded-full bg-warning/15 px-2 py-1 text-warning">Needs Review</span> : null}
                      {line.duplicateCandidates.length > 0 ? <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">Possible duplicate</span> : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="rounded-xl border bg-muted/20 px-3 py-2">
                      <p className="text-sm font-semibold text-foreground">{language === "zh" ? line.displayNameZh || line.displayName || line.extractedName : line.displayName || line.extractedName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Original: {line.rawName ?? line.rawLine ?? "N/A"}</p>
                    </div>
                    <label className="text-xs text-muted-foreground">Item name</label>
                    <input
                      value={line.extractedName}
                      onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!canReview}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Qty</label>
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
                        <label className="text-xs text-muted-foreground">Unit</label>
                        <input
                          value={line.extractedUnit ?? ""}
                          onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))}
                          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Price</label>
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
                      <p>
                        Suggested: {formatCategoryLabel(line.suggestedCategory)} in {formatCategoryLabel(line.suggestedStorageLocation)}
                      </p>
                      <p className="mt-1">Suggested expiration: {formatSuggestedDate(line.suggestedExpirationDate)}</p>
                      <p className="mt-1">Normalization confidence: {Math.round((line.normalizationConfidence ?? line.confidence ?? 0) * 100)}%</p>
                    </div>

                    {line.duplicateCandidates.length > 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm font-medium text-foreground">Possible duplicate found</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {line.duplicateCandidates[0]?.name} • {line.duplicateCandidates[0]?.quantity} {line.duplicateCandidates[0]?.unit} • {formatCategoryLabel(line.duplicateCandidates[0]?.storageLocation ?? "PANTRY")}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={(line.mergeStrategy ?? line.defaultAction) === "MERGE" ? "default" : "outline"}
                            onClick={() => setMergeChoice(line.id, "MERGE", line.duplicateCandidates[0]?.id ?? null)}
                          >
                            Merge into existing
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={(line.mergeStrategy ?? line.defaultAction) === "CREATE_NEW" ? "secondary" : "outline"}
                            onClick={() => setMergeChoice(line.id, "CREATE_NEW", null)}
                          >
                            Keep separate
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <p className="text-xs font-medium">Status: {line.lineStatus}</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => saveCorrection(line)}>
                        This is actually...
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Source: {line.rawLine ?? "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="w-full min-w-[880px] border-collapse">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Include</th>
                    <th className="px-3 py-2">Item Name</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Confidence</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((line) => (
                    <tr key={line.id} className="border-t align-top">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedIds.includes(line.id)} onChange={() => toggleSelected(line.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <p className="mb-1 text-xs font-medium text-foreground">
                          {language === "zh" ? line.displayNameZh || line.displayName || line.extractedName : line.displayName || line.extractedName}
                        </p>
                        <input
                          value={line.extractedName}
                          onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Source: {line.rawLine ?? "N/A"}</p>
                        {line.needsReview ? <p className="mt-1 text-xs font-medium text-warning">Needs Review</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Suggested: {formatCategoryLabel(line.suggestedCategory)} • {formatCategoryLabel(line.suggestedStorageLocation)} • {formatSuggestedDate(line.suggestedExpirationDate)}
                        </p>
                        {line.duplicateCandidates.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-primary">Possible duplicate: {line.duplicateCandidates[0]?.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant={(line.mergeStrategy ?? line.defaultAction) === "MERGE" ? "default" : "outline"}
                              onClick={() => setMergeChoice(line.id, "MERGE", line.duplicateCandidates[0]?.id ?? null)}
                            >
                              Merge
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={(line.mergeStrategy ?? line.defaultAction) === "CREATE_NEW" ? "secondary" : "outline"}
                              onClick={() => setMergeChoice(line.id, "CREATE_NEW", null)}
                            >
                              Separate
                            </Button>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
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
                          className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={line.extractedUnit ?? ""}
                          onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))}
                          className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                      </td>
                      <td className="px-3 py-2">
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
                          className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {line.confidence != null ? line.confidence.toFixed(2) : "N/A"}
                        {line.needsReview ? <span className="mt-1 block font-medium text-warning">Needs Review</span> : null}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{line.lineStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : null}
          {results.length > 0 && canReview ? (
            <div className="sticky bottom-[max(env(safe-area-inset-bottom),0px)] flex flex-col gap-2 rounded-xl border bg-card/95 p-2 pt-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:flex-row">
              <Button className="w-full md:w-auto" variant="secondary" type="button" onClick={() => setSelectedIds(results.map((line) => line.id))}>
                Select All
              </Button>
              <Button className="w-full md:w-auto" variant="outline" type="button" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
              <Button
                className={hasAddedToInventory ? "w-full bg-success text-success-foreground md:w-auto" : "w-full md:w-auto"}
                type="button"
                onClick={addSelectedToInventory}
                disabled={disableAddButton}
                aria-label="Add selected items to inventory"
              >
                {hasAddedToInventory ? "Completed" : isSubmittingSelection ? "Adding..." : "Add Selected to Inventory"}
              </Button>
              {hasAddedToInventory ? (
                <Button className="w-full md:w-auto" type="button" variant="outline" asChild>
                  <Link href="/inventory" aria-label="View inventory">View Inventory</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
