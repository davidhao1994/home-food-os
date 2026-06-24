"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OcrItem = {
  id: string;
  rawLine: string | null;
  extractedName: string;
  extractedQuantity: number | null;
  extractedUnit: string | null;
  extractedPrice: number | null;
  confidence: number | null;
};

export function ReceiptUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [receiptUploadId, setReceiptUploadId] = useState("");
  const [retailer, setRetailer] = useState("unknown");
  const [results, setResults] = useState<OcrItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

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

    setIsExtracting(true);

    let imageData = "";
    try {
      imageData = await toBase64(file);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to read receipt image.");
      setIsExtracting(false);
      return;
    }

    const response = await fetch("/api/receipts/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData, fileName: file.name, mimeType: file.type })
    });

    if (!response.ok) {
      setStatus("Unable to extract receipt data from this image right now.");
      setIsExtracting(false);
      return;
    }

    const data = await response.json();
    const nextResults = data.ocrResults ?? [];
    setReceiptUploadId(data.receiptUploadId ?? "");
    setRetailer(data.retailer ?? "unknown");
    setResults(nextResults);
    setSelectedIds(nextResults.map((line: OcrItem) => line.id));
    setStatus(`Extracted ${nextResults.length} receipt lines. Review and correct before adding to inventory.`);
    setIsExtracting(false);
  };

  const addSelectedToInventory = async () => {
    if (!receiptUploadId || selectedIds.length === 0) {
      setStatus("Select at least one extracted item to add into inventory.");
      return;
    }

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
      setStatus("Unable to add the selected receipt items into inventory.");
      return;
    }

    const data = await response.json();
    setStatus(`Added ${data.addedCount} selected receipt items into inventory.`);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const updateLine = (id: string, updater: (line: OcrItem) => OcrItem) => {
    setResults((current) => current.map((line) => (line.id === id ? updater(line) : line)));
  };

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
            <Button className="w-full md:w-auto" type="submit" disabled={isExtracting}>{isExtracting ? "Extracting..." : "Extract Items"}</Button>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            <p className="text-xs text-muted-foreground">Supported first: Costco, Walmart, and Safeway receipts.</p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OCR Review Queue ({retailer})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {results.length === 0 ? <p className="text-muted-foreground">No OCR results yet.</p> : null}
          {results.map((line) => (
            <div key={line.id} className="rounded-lg border p-3">
              <label className="mb-2 flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.includes(line.id)} onChange={() => toggleSelected(line.id)} />
                <span className="text-xs text-muted-foreground">Include item</span>
              </label>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  value={line.extractedName}
                  onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedName: event.target.value }))}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                />
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
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={line.extractedUnit ?? ""}
                  onChange={(event) => updateLine(line.id, (current) => ({ ...current, extractedUnit: event.target.value || null }))}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
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
                  placeholder="Price"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Source line: {line.rawLine ?? "N/A"} • Confidence: {line.confidence ?? "N/A"}
              </p>
            </div>
          ))}
          {results.length > 0 ? (
            <div className="flex flex-col gap-2 pt-2 md:flex-row">
              <Button className="w-full md:w-auto" variant="secondary" type="button" onClick={() => setSelectedIds(results.map((line) => line.id))}>
                Select All
              </Button>
              <Button className="w-full md:w-auto" type="button" onClick={addSelectedToInventory}>
                Add Selected to Inventory
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
