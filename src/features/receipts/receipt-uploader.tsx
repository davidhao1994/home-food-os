"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReceiptWorkflowStatus = "UPLOADED" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";

type OcrItem = {
  id: string;
  rawLine: string | null;
  extractedName: string;
  extractedQuantity: number | null;
  extractedUnit: string | null;
  extractedPrice: number | null;
  confidence: number | null;
  lineStatus: "EXTRACTED" | "CONFIRMED" | "REJECTED";
};

type ReceiptStatusPayload = {
  receiptUploadId: string;
  status: ReceiptWorkflowStatus;
  retailer: string;
  ocrResults: OcrItem[];
  error?: string;
};

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

export function ReceiptUploader() {
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

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
    setReceiptUploadId(payload.receiptUploadId);
    setWorkflowStatus(nextStatus);
    setRetailer(payload.retailer ?? "unknown");
    setResults(payload.ocrResults ?? []);
    mergeSelectedIds(payload.ocrResults ?? []);

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
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
      imageData = await toBase64(file);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Unable to read receipt image.");
      setIsUploading(false);
      return;
    }

    const response = await fetch("/api/receipts/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type })
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
            extractedName: line.extractedName,
            extractedQuantity: line.extractedQuantity,
            extractedUnit: line.extractedUnit,
            extractedPrice: line.extractedPrice
          }))
        })
      });

      if (!response.ok) {
        setStatusTone("error");
        setStatus("Unable to add the selected receipt items into inventory.");
        return;
      }

      const data = (await response.json()) as { addedCount: number; alreadyProcessed?: boolean };
      if (data.alreadyProcessed) {
        setStatusTone("success");
        setStatus("Items added to inventory successfully.");
        setHasAddedToInventory(true);
        setWorkflowStatus("COMPLETED");
        return;
      }

      setStatusTone("success");
      setStatus(
        data.addedCount > 0
          ? `Items added to inventory successfully. (${data.addedCount} items)`
          : "Items added to inventory successfully."
      );
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

  const canReview = workflowStatus === "REVIEW_REQUIRED" || workflowStatus === "COMPLETED";
  const disableAddButton = hasAddedToInventory || isSubmittingSelection || selectedIds.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Receipt (Real OCR)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button className="w-full md:w-auto" type="submit" disabled={isUploading || workflowStatus === "PROCESSING"}>
              {isUploading || workflowStatus === "PROCESSING" ? "Extracting..." : "Extract Items"}
            </Button>
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
            <div className="space-y-3 md:hidden">
              {results.map((line) => (
                <div key={line.id} className="rounded-lg border p-3">
                  <label className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(line.id)}
                      onChange={() => toggleSelected(line.id)}
                      aria-label={`Include ${line.extractedName}`}
                    />
                    Include item
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-muted-foreground">Item Name</label>
                    <input
                      value={line.extractedName}
                      onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!canReview}
                    />
                    <label className="text-xs text-muted-foreground">Quantity</label>
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
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!canReview}
                    />
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <input
                      value={line.extractedUnit ?? ""}
                      onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!canReview}
                    />
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
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={!canReview}
                    />
                    <p className="text-xs text-muted-foreground">Confidence: {line.confidence != null ? line.confidence.toFixed(2) : "N/A"}</p>
                    <p className="text-xs font-medium">Status: {line.lineStatus}</p>
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
                        <input
                          value={line.extractedName}
                          onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={!canReview}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Source: {line.rawLine ?? "N/A"}</p>
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
            <div className="sticky bottom-[max(env(safe-area-inset-bottom),0px)] flex flex-col gap-2 rounded-xl border bg-card/95 p-2 pt-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:flex-row">
              <Button className="w-full md:w-auto" variant="secondary" type="button" onClick={() => setSelectedIds(results.map((line) => line.id))}>
                Select All
              </Button>
              <Button className="w-full md:w-auto" type="button" onClick={addSelectedToInventory} disabled={disableAddButton} aria-label="Add selected items to inventory">
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
