"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle, CheckCircle, Download, Loader2, PenLine, RotateCcw,
} from "lucide-react";

interface DocInfo {
  id: string;
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  fileName: string;
  mimeType: string;
  signatoryName: string;
  signatoryEmail: string;
}

export default function SignPage() {
  const { token } = useParams<{ token: string }>();

  // ── Document loading ───────────────────────────────────────────────────────
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── Signature state ────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  // ── Submission ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [signed, setSigned] = useState(false);

  // ── Load document info ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.document) {
          setDoc(data.document);
        } else {
          setLoadError(data.error ?? "This signing link is invalid or has expired.");
        }
      })
      .catch(() => setLoadError("Failed to load the document. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Canvas drawing helpers ─────────────────────────────────────────────────
  const getCanvasPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a1628";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const applyTypedSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !typedName) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 38px 'Georgia', serif";
    ctx.fillStyle = "#0a1628";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    setHasDrawn(true);
  };

  // ── Submit signature ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!doc || !token || !hasDrawn) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not ready");
      const signatureImage = canvas.toDataURL("image/png");

      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatoryName: doc.signatoryName,
          signatoryEmail: doc.signatoryEmail,
          signatureImage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
      } else {
        setSubmitError(data.error ?? "Signing failed. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fileUrl = `/api/sign/${token}/file`;
  const isPDF = doc?.mimeType === "application/pdf";
  const isImage = doc?.mimeType?.startsWith("image/");

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading document…
      </div>
    );
  }

  // ── Invalid / expired link ─────────────────────────────────────────────────
  if (loadError) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-10 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Link Invalid or Expired</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Signing links expire after 7 days. Contact the sender to request a new link.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (signed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Document Signed!</h2>
          <p className="text-sm text-green-700">
            Thank you, <strong>{doc?.signatoryName}</strong>. Your e-signature has been recorded.
          </p>
          <p className="text-xs text-green-600 mt-3 max-w-sm mx-auto">
            The document has been automatically routed back for review and approval.
            A confirmation has been sent to <strong>{doc?.signatoryEmail}</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Main signing UI ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Document Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-violet-600" />
            E-Signature Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Document</span>
              <span className="font-semibold">{doc?.title}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">From</span>
              <span>{doc?.senderName || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Purpose</span>
              <span className="text-gray-700">{doc?.purpose}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Signing As</span>
              <span className="font-medium">{doc?.signatoryName}</span>
              <span className="text-muted-foreground text-xs block">{doc?.signatoryEmail}</span>
            </div>
          </div>
          <div className="mt-4 text-xs bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-amber-800">
            ⚠ Please review the full document below before signing. Your e-signature is legally binding.
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">Document Preview</CardTitle>
          <a
            href={fileUrl}
            download={doc?.fileName}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-normal"
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-xl">
          {isPDF ? (
            <iframe
              src={fileUrl}
              className="w-full"
              style={{ height: "520px", border: "none" }}
              title="Document Preview"
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={doc?.title}
              className="w-full object-contain max-h-[500px] p-4 bg-gray-50"
            />
          ) : (
            <div className="p-10 text-center text-muted-foreground bg-gray-50">
              <Download className="h-10 w-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Preview not available for this file type</p>
              <a
                href={fileUrl}
                download={doc?.fileName}
                className="text-blue-600 underline text-sm mt-2 inline-block"
              >
                Download {doc?.fileName} to review
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "draw" ? "default" : "outline"}
              onClick={() => { setMode("draw"); clearCanvas(); }}
              style={mode === "draw" ? { backgroundColor: "var(--navy)", color: "white" } : {}}
            >
              ✏ Draw Signature
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "type" ? "default" : "outline"}
              onClick={() => { setMode("type"); clearCanvas(); }}
              style={mode === "type" ? { backgroundColor: "var(--navy)", color: "white" } : {}}
            >
              Aa Type Name
            </Button>
          </div>

          {/* Type mode input */}
          {mode === "type" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="typedName" className="sr-only">Type your name</Label>
                <Input
                  id="typedName"
                  placeholder="Type your full name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyTypedSignature()}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={applyTypedSignature}
                disabled={!typedName.trim()}
              >
                Apply
              </Button>
            </div>
          )}

          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full border-2 border-dashed rounded-lg bg-white touch-none cursor-crosshair"
              style={{
                borderColor: hasDrawn ? "#0a1628" : "#d1d5db",
                transition: "border-color 0.2s",
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasDrawn && mode === "draw" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-300 select-none">Sign here</span>
              </div>
            )}
            <button
              type="button"
              onClick={clearCanvas}
              title="Clear signature"
              className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Signature line with name */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-xs text-muted-foreground font-medium">{doc?.signatoryName}</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!hasDrawn || submitting}
            className="w-full gap-2 h-11"
            style={
              hasDrawn
                ? { backgroundColor: "#0a1628", color: "white" }
                : {}
            }
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting signature…</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Sign & Approve Document</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By clicking &ldquo;Sign &amp; Approve Document&rdquo;, you acknowledge that this
            e-signature represents your intent to sign and is as legally binding as a
            handwritten signature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
