"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, CheckCircle, Loader2, Tag } from "lucide-react";
import { formatCurrency, formatShortDate, subsidiaryLabel } from "@/lib/utils";
import Link from "next/link";

const SUBSIDIARIES = [
  { value: "NONE", label: "— Untagged —" },
  { value: "HOLDING_GDS_CAPITAL", label: "GDS Capital" },
  { value: "BUSINESS_MGMT_CONSULTANCY", label: "Business Mgmt & Consultancy" },
  { value: "MEDIA_ADVERTISING", label: "Media & Advertising" },
  { value: "EVENTS_IT", label: "Events & IT" },
  { value: "TRAVEL_AGENCY", label: "Travel Agency" },
  { value: "VIRTUAL_PHYSICAL_OFFICE", label: "Virtual & Physical Office" },
  { value: "EV_CHARGERS", label: "EV Chargers" },
];

interface LineItem {
  id: string;
  transactionDate: string | null;
  description: string;
  amount: string;
  subsidiary: string | null;
  category: string | null;
  isAiTagged: boolean;
}

interface Statement {
  id: string;
  fileName: string;
  status: string;
  bankName: string | null;
  cardLast4: string | null;
  totalAmount: string | null;
  lineItems: LineItem[];
}

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const fetchStatement = useCallback(async () => {
    const res = await fetch(`/api/billing/${id}`);
    if (res.ok) {
      const data = await res.json();
      setStatement(data.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  async function updateTag(itemId: string, subsidiary: string) {
    setSaving(itemId);
    await fetch(`/api/billing/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, subsidiary: subsidiary === "NONE" ? null : subsidiary }),
    });
    setSaving(null);
    await fetchStatement();
  }

  async function finalize() {
    setFinalizing(true);
    await fetch(`/api/billing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finalize" }),
    });
    setFinalizing(false);
    router.refresh();
    await fetchStatement();
  }

  function exportCSV() {
    if (!statement) return;
    const rows = [
      ["Date", "Description", "Amount", "Subsidiary", "Category"],
      ...statement.lineItems.map((item) => [
        item.transactionDate ? formatShortDate(item.transactionDate) : "",
        `"${item.description}"`,
        parseFloat(item.amount).toFixed(2),
        item.subsidiary ? subsidiaryLabel(item.subsidiary) : "Untagged",
        item.category ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${statement.fileName}-tagged.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!statement) return <div className="p-6">Statement not found.</div>;

  const totalAmount = statement.totalAmount ? parseFloat(statement.totalAmount) : null;
  const taggedCount = statement.lineItems.filter((i) => i.subsidiary).length;
  const totalCount = statement.lineItems.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{statement.fileName}</h1>
            <div className="text-sm text-muted-foreground">
              {statement.bankName ?? "Bank"} {statement.cardLast4 ? `••••${statement.cardLast4}` : ""} •{" "}
              {taggedCount}/{totalCount} tagged
              {totalAmount != null && ` • ${formatCurrency(totalAmount)} total`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {statement.status !== "FINALIZED" && (
            <Button
              onClick={finalize}
              disabled={finalizing}
              className="gap-2"
              style={{ backgroundColor: "var(--navy)", color: "white" }}
            >
              {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Finalize
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Line Items — Tag per Subsidiary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {statement.lineItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.transactionDate ? formatShortDate(item.transactionDate) : "No date"}
                    {item.category && ` • ${item.category}`}
                    {item.isAiTagged && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">AI</Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm font-mono font-medium whitespace-nowrap">
                  {formatCurrency(parseFloat(item.amount))}
                </div>
                <div className="w-52">
                  <Select
                    value={item.subsidiary ?? "NONE"}
                    onValueChange={(val) => updateTag(item.id, val)}
                    disabled={saving === item.id || statement.status === "FINALIZED"}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSIDIARIES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {saving === item.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
