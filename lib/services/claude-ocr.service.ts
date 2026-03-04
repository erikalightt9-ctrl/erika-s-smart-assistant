import { anthropic } from "@/lib/claude";
import type { BillingLineItemInput } from "@/types";

const SUBSIDIARIES = [
  "GDS Capital (Holding)",
  "Business Management & Consultancy",
  "Media & Advertising",
  "Events & IT",
  "Travel Agency",
  "Virtual & Physical Office",
  "EV Chargers",
];

const SUBSIDIARY_MAP: Record<string, string> = {
  "GDS Capital": "HOLDING_GDS_CAPITAL",
  "Business Management & Consultancy": "BUSINESS_MGMT_CONSULTANCY",
  "Business Mgmt": "BUSINESS_MGMT_CONSULTANCY",
  "Media & Advertising": "MEDIA_ADVERTISING",
  "Events & IT": "EVENTS_IT",
  "Travel Agency": "TRAVEL_AGENCY",
  "Virtual & Physical Office": "VIRTUAL_PHYSICAL_OFFICE",
  "EV Chargers": "EV_CHARGERS",
};

function mapSubsidiary(name: string): string | null {
  for (const [key, value] of Object.entries(SUBSIDIARY_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return null;
}

export interface ExtractedStatement {
  statementDate?: string;
  cardLast4?: string;
  bankName?: string;
  totalAmount?: number;
  lineItems: BillingLineItemInput[];
}

export async function extractBillingStatement(
  base64Image: string,
  mimeType: string
): Promise<ExtractedStatement> {
  const prompt = `You are an expert at reading Philippine credit card and bank statements.

Extract ALL transaction line items from this billing statement image/document.

Return a JSON object with this exact structure:
{
  "statementDate": "YYYY-MM-DD or null",
  "cardLast4": "last 4 digits or null",
  "bankName": "bank name or null",
  "totalAmount": number or null,
  "lineItems": [
    {
      "transactionDate": "YYYY-MM-DD or null",
      "description": "full transaction description",
      "amount": number (positive for charges, negative for credits/payments),
      "suggestedSubsidiary": "one of: ${SUBSIDIARIES.join(", ")} or null if unclear",
      "category": "category like Travel, Meals, Software, Office Supplies, Utilities, etc."
    }
  ]
}

Rules:
- Include EVERY line item visible, even if amount is 0
- For the suggestedSubsidiary, use context clues from the description (e.g., "Airbnb" → Travel Agency, "Meta Ads" → Media & Advertising, "Globe Business" → could be Events & IT)
- Return ONLY valid JSON, no markdown, no explanation`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  let parsed: {
    statementDate?: string;
    cardLast4?: string;
    bankName?: string;
    totalAmount?: number;
    lineItems?: Array<{
      transactionDate?: string;
      description: string;
      amount: number;
      suggestedSubsidiary?: string;
      category?: string;
    }>;
  };

  try {
    // Strip markdown code blocks if present
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { lineItems: [] };
  }

  const lineItems: BillingLineItemInput[] = (parsed.lineItems ?? []).map((item) => {
    const mappedSub = item.suggestedSubsidiary
      ? mapSubsidiary(item.suggestedSubsidiary)
      : null;
    return {
      transactionDate: item.transactionDate ?? undefined,
      description: item.description ?? "",
      amount: item.amount ?? 0,
      subsidiary: mappedSub ? (mappedSub as import("@prisma/client").Subsidiary) : undefined,
      category: item.category ?? undefined,
    };
  });

  return {
    statementDate: parsed.statementDate ?? undefined,
    cardLast4: parsed.cardLast4 ?? undefined,
    bankName: parsed.bankName ?? undefined,
    totalAmount: parsed.totalAmount ?? undefined,
    lineItems,
  };
}
