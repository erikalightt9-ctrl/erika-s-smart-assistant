"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BadgeDollarSign, Calculator, AlertCircle, Loader2, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ContributionResult {
  monthlySalary: number;
  sss: { employeeShare: number; employerShare: number; total: number };
  philhealth: { employeeShare: number; employerShare: number; total: number };
  pagibig: { employeeShare: number; employerShare: number; total: number };
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
}

const DEADLINES = [
  { type: "SSS", deadline: "10th of next month", color: "bg-blue-500" },
  { type: "PhilHealth", deadline: "10th of next month", color: "bg-green-500" },
  { type: "Pag-IBIG", deadline: "10th of next month", color: "bg-purple-500" },
];

export default function ContributionsPage() {
  const [salary, setSalary] = useState("");
  const [result, setResult] = useState<ContributionResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    if (!salary) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contributions/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlySalary: parseFloat(salary) }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!result) return;
    const rows = [
      ["Contribution Type", "Employee Share", "Employer Share", "Total"],
      ["SSS", result.sss.employeeShare, result.sss.employerShare, result.sss.total],
      ["PhilHealth", result.philhealth.employeeShare, result.philhealth.employerShare, result.philhealth.total],
      ["Pag-IBIG", result.pagibig.employeeShare, result.pagibig.employerShare, result.pagibig.total],
      ["TOTAL DEDUCTIONS", result.totalEmployeeDeductions, result.totalEmployerCost, ""],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contributions-${salary}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeDollarSign className="h-6 w-6" />
          Regulatory Compliance Management
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Contribution Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Basic Salary (₱)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  min="0"
                  step="500"
                />
                <Button
                  onClick={compute}
                  disabled={loading || !salary}
                  style={{ backgroundColor: "var(--navy)", color: "white" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Compute"}
                </Button>
              </div>
            </div>

            {result && (
              <div className="space-y-3 pt-2">
                <Separator />

                {[
                  { label: "SSS", data: result.sss, color: "text-blue-600" },
                  { label: "PhilHealth", data: result.philhealth, color: "text-green-600" },
                  { label: "Pag-IBIG", data: result.pagibig, color: "text-purple-600" },
                ].map(({ label, data, color }) => (
                  <div key={label} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${color}`}>{label}</span>
                      <Badge variant="outline">{formatCurrency(data.total)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Employee: <span className="font-medium text-foreground">{formatCurrency(data.employeeShare)}</span></div>
                      <div>Employer: <span className="font-medium text-foreground">{formatCurrency(data.employerShare)}</span></div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
                    <div className="text-xs text-muted-foreground mb-1">Total Employee Deductions</div>
                    <div className="text-lg font-bold text-red-600">{formatCurrency(result.totalEmployeeDeductions)}</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
                    <div className="text-xs text-muted-foreground mb-1">Total Employer Cost</div>
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(result.totalEmployerCost)}</div>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2" onClick={downloadCSV}>
                  <Download className="h-4 w-4" />
                  Export as CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadlines & info */}
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-4 w-4" />
                Monthly Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEADLINES.map((d) => (
                <div key={d.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${d.color}`} />
                    <span className="font-medium">{d.type}</span>
                  </div>
                  <span className="text-muted-foreground">{d.deadline}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2024 Rates Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-blue-600 mb-1">SSS</div>
                <div className="text-muted-foreground">Employee: 4.5% of MSC • Employer: 9.5% of MSC</div>
                <div className="text-muted-foreground">MSC range: ₱4,000 – ₱30,000</div>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-green-600 mb-1">PhilHealth</div>
                <div className="text-muted-foreground">5% of basic salary (50/50 split)</div>
                <div className="text-muted-foreground">Maximum: ₱5,000/month total</div>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-purple-600 mb-1">Pag-IBIG</div>
                <div className="text-muted-foreground">Employee: 2% (max ₱200) • Employer: 2%</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
