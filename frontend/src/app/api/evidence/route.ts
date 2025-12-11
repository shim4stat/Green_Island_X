import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, DEFAULT_CHAIN_ID } from "@/lib/abi";
import type { EvidenceVerificationResult, ReductionClaim } from "@/types";

const ATTESTER_PRIVATE_KEY = process.env.ATTESTER_PRIVATE_KEY;

function getAttesterWallet(): ethers.Wallet {
  if (!ATTESTER_PRIVATE_KEY) {
    throw new Error(
      "ATTESTER_PRIVATE_KEY is not set. Please configure it in your environment."
    );
  }
  return new ethers.Wallet(ATTESTER_PRIVATE_KEY);
}

function sha256Hex(buffer: Buffer): string {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

function getDomain() {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "CONTRACT_ADDRESS is not set. Please configure NEXT_PUBLIC_CONTRACT_ADDRESS."
    );
  }
  return {
    name: "EcoDAO",
    version: "1",
    chainId: DEFAULT_CHAIN_ID,
    verifyingContract: CONTRACT_ADDRESS,
  } as const;
}

const CLAIM_TYPES = {
  Claim: [
    { name: "user", type: "address" },
    { name: "daoId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "expiresAt", type: "uint256" },
  ],
} as const;

async function runOcrOnImage(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const endpoint = process.env.OCR_API_ENDPOINT;
  const apiKey = process.env.OCR_API_KEY;

  if (!endpoint || !apiKey) {
    return "";
  }

  const base64 = buffer.toString("base64");
  const body = new URLSearchParams();
  body.append(
    "base64Image",
    `data:${contentType || "image/png"};base64,${base64}`
  );
  body.append("language", "jpn");
  body.append("isOverlayRequired", "false");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    return "";
  }

  const data = (await res.json()) as any;

  // Debug: Log OCR response
  console.log("[OCR Debug] Response:", JSON.stringify(data, null, 2));

  if (Array.isArray(data.ParsedResults) && data.ParsedResults[0]?.ParsedText) {
    const parsedText = String(data.ParsedResults[0].ParsedText);
    console.log("[OCR Debug] Parsed text:", parsedText);
    return parsedText;
  }

  if (typeof data.text === "string") {
    console.log("[OCR Debug] Text field:", data.text);
    return data.text;
  }

  console.log("[OCR Debug] No text found in response");
  return "";
}

function estimateFromElectricityBill(ocrText: string): {
  amountGrams: number;
  amountKg: number;
  reason: string;
} | null {
  const emissionFactor =
    Number(process.env.EMISSION_FACTOR_KG_PER_KWH ?? "0.5") || 0.5;
  const unitPrice =
    Number(process.env.UNIT_PRICE_YEN_PER_KWH ?? "30") || 30;

  const lines = ocrText.split(/\r?\n/);
  const kwhValues: number[] = [];
  const yenValues: number[] = [];
  const allNumbers: number[] = [];

  for (const line of lines) {
    // Try to find kWh values (more flexible pattern)
    const mKwh = line.match(/([\d,.]+)\s*k?[Ww]?[Hh]?/i);
    if (mKwh) {
      const num = Number(mKwh[1].replace(/,/g, ""));
      if (!Number.isNaN(num) && num > 0 && num < 10000) {
        kwhValues.push(num);
      }
    }

    // Try to find Yen values (more flexible)
    const mYen = line.match(/([\d,]+)\s*[円圓]/);
    if (mYen) {
      const num = Number(mYen[1].replace(/,/g, ""));
      if (!Number.isNaN(num) && num > 0) {
        yenValues.push(num);
      }
    }

    // Extract all numbers as fallback
    const numbers = line.match(/[\d,]+/g);
    if (numbers) {
      for (const numStr of numbers) {
        const num = Number(numStr.replace(/,/g, ""));
        if (!Number.isNaN(num) && num > 0 && num < 100000) {
          allNumbers.push(num);
        }
      }
    }
  }

  console.log("[Electricity] Found kWh values:", kwhValues);
  console.log("[Electricity] Found Yen values:", yenValues);
  console.log("[Electricity] All numbers:", allNumbers.slice(0, 10));

  let usedKwh: number | null = null;
  let reason: string;

  if (kwhValues.length > 0) {
    // Use the largest kWh value (likely the total usage)
    usedKwh = Math.max(...kwhValues);
    reason = `電気料金の明細から OCR で読み取った使用量 ${usedKwh.toFixed(
      1
    )} kWh をもとに計算しました。`;
  } else if (yenValues.length > 0) {
    // Use the largest yen value for estimation
    const yen = Math.max(...yenValues.filter(y => y > 1000));
    usedKwh = yen / unitPrice;
    reason = `電気料金の合計金額 ${yen.toLocaleString()} 円 を 1 kWh あたり ${unitPrice} 円 とみなし、使用量を約 ${usedKwh.toFixed(
      1
    )} kWh と推定しました。`;
  } else if (allNumbers.length > 0) {
    // Fallback: assume the largest reasonable number is kWh
    const candidates = allNumbers.filter(n => n > 10 && n < 2000);
    if (candidates.length > 0) {
      usedKwh = Math.max(...candidates);
      reason = `OCR で明確な単位は読み取れませんでしたが、数値 ${usedKwh.toFixed(
        0
      )} を電力使用量 (kWh) として推定しました。`;
    } else {
      return null;
    }
  } else {
    return null;
  }

  const kg = usedKwh * emissionFactor;
  const grams = Math.floor(kg * 1000);

  reason += ` 排出係数 ${emissionFactor} kg CO₂/kWh を掛け合わせ、${kg.toFixed(
    3
  )} kg CO₂ の削減があったと算出しました。`;

  return {
    amountGrams: grams,
    amountKg: grams / 1000,
    reason,
  };
}

function estimateFromSteps(ocrText: string): {
  amountGrams: number;
  amountKg: number;
  reason: string;
} | null {
  const stepMatch = ocrText.match(/([\d,]+)\s*(歩|steps?)/i);
  if (!stepMatch) {
    return null;
  }

  const steps = Number(stepMatch[1].replace(/,/g, ""));
  if (Number.isNaN(steps) || steps <= 0) {
    return null;
  }

  const stepLengthM =
    Number(process.env.STEP_LENGTH_M ?? "0.7") || 0.7;
  const carEmissionPerKm =
    Number(process.env.CAR_EMISSION_KG_PER_KM ?? "0.2") || 0.2;

  const distanceKm = (steps * stepLengthM) / 1000;
  const kg = distanceKm * carEmissionPerKm;
  const grams = Math.floor(kg * 1000);

  const reason =
    `歩数スクリーンショットから OCR で ${steps.toLocaleString()} 歩と推定しました。` +
    `1 歩あたり ${stepLengthM} m と仮定し、合計距離 ${distanceKm.toFixed(
      2
    )} km を徒歩とみなしました。` +
    `自家用車の排出係数 ${carEmissionPerKm} kg CO₂/km と比較し、${kg.toFixed(
      3
    )} kg CO₂ の削減があったと算出しました。`;

  return {
    amountGrams: grams,
    amountKg: grams / 1000,
    reason,
  };
}

function estimateFromSolar(ocrText: string): {
  amountGrams: number;
  amountKg: number;
  reason: string;
} | null {
  const emissionFactor =
    Number(process.env.EMISSION_FACTOR_KG_PER_KWH ?? "0.5") || 0.5;

  const match = ocrText.match(/([\d,.]+)\s*kWh/i);
  if (!match) {
    return null;
  }

  const kwh = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(kwh) || kwh <= 0) {
    return null;
  }

  const kg = kwh * emissionFactor;
  const grams = Math.floor(kg * 1000);

  const reason =
    `太陽光発電モニターから OCR で本日の発電電力量を ${kwh.toFixed(
      1
    )} kWh と推定しました。` +
    `グリッドの平均排出係数 ${emissionFactor} kg CO₂/kWh と比較し、${kg.toFixed(
      3
    )} kg CO₂ の削減があったと算出しました。`;

  return {
    amountGrams: grams,
    amountKg: grams / 1000,
    reason,
  };
}

function estimateFallback(evidenceType: string): {
  amountGrams: number;
  amountKg: number;
  reason: string;
} {
  let kg = 1;
  let reason =
    "OCR による自動解析に失敗したため、証拠の種類に応じた簡易ルールで 1 kg CO₂ の削減があったと仮定しました。";

  if (evidenceType === "electricity") {
    kg = 2;
    reason =
      "電気料金明細として提出されましたが数値の解析に失敗したため、家庭の平均的な節電量を 2 kg CO₂ として仮定しました。";
  } else if (evidenceType === "transportation") {
    kg = 1.5;
    reason =
      "移動手段の記録として提出されましたが数値の解析に失敗したため、自家用車から公共交通への切り替え 1 回分を 1.5 kg CO₂ として仮定しました。";
  } else if (evidenceType === "solar") {
    kg = 2;
    reason =
      "太陽光発電の記録として提出されましたが数値の解析に失敗したため、1 日あたり 2 kg CO₂ 相当の削減があったと仮定しました。";
  }

  const grams = Math.floor(kg * 1000);
  return {
    amountGrams: grams,
    amountKg: grams / 1000,
    reason,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const daoIdRaw = formData.get("daoId");
    const userAddressRaw = formData.get("userAddress");
    const evidenceTypeRaw = formData.get("evidenceType") ?? "other";
    const periodRaw = formData.get("period") ?? "";
    const estimatedKgRaw = formData.get("estimatedKg");
    const file = formData.get("evidenceImage");

    if (!daoIdRaw || !userAddressRaw || !file) {
      return NextResponse.json(
        {
          error:
            "daoId, userAddress, evidenceImage は必須です。フォーム入力を確認してください。",
        },
        { status: 400 }
      );
    }

    const daoId = Number(daoIdRaw);
    const userAddress = String(userAddressRaw);
    const evidenceType = String(evidenceTypeRaw);
    const period =
      typeof periodRaw === "string" ? String(periodRaw) : undefined;

    if (!Number.isFinite(daoId) || daoId <= 0) {
      return NextResponse.json(
        { error: "daoId が不正です。" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { error: "userAddress が有効なアドレスではありません。" },
        { status: 400 }
      );
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "evidenceImage の形式が不正です。" },
        { status: 400 }
      );
    }

    let estimatedKg: number | null = null;
    if (typeof estimatedKgRaw === "string" && estimatedKgRaw.trim() !== "") {
      const parsed = Number(estimatedKgRaw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        estimatedKg = parsed;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType =
      (file as any).type && typeof (file as any).type === "string"
        ? ((file as any).type as string)
        : "image/png";

    const evidenceHash = sha256Hex(buffer);

    const ocrText = await runOcrOnImage(buffer, contentType);
    console.log("[Evidence API] OCR Text length:", ocrText.length);
    if (ocrText) {
      console.log("[Evidence API] OCR Text preview:", ocrText.substring(0, 200));
    }

    let amountGrams: number;
    let amountKg: number;
    let reason: string;

    let resultFromOcr: {
      amountGrams: number;
      amountKg: number;
      reason: string;
    } | null = null;

    if (ocrText) {
      if (evidenceType === "electricity") {
        resultFromOcr = estimateFromElectricityBill(ocrText);
      } else if (evidenceType === "transportation") {
        resultFromOcr = estimateFromSteps(ocrText);
      } else if (evidenceType === "solar") {
        resultFromOcr = estimateFromSolar(ocrText);
      }
    }

    if (resultFromOcr) {
      amountGrams = resultFromOcr.amountGrams;
      amountKg = resultFromOcr.amountKg;
      reason = resultFromOcr.reason;
    } else if (estimatedKg !== null && estimatedKg > 0) {
      const grams = Math.floor(estimatedKg * 1000);
      amountGrams = grams;
      amountKg = grams / 1000;
      reason =
        "OCR による自動解析に失敗したため、ユーザー自己申告の削減量を 1 kg = 1000 g としてそのまま記録対象としました。";
    } else {
      const fallback = estimateFallback(evidenceType);
      amountGrams = fallback.amountGrams;
      amountKg = fallback.amountKg;
      reason = fallback.reason;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 60 * 60 * 24 * 30;
    // Use smaller nonce to avoid overflow - 32-bit is sufficient for uniqueness
    const nonce = crypto.randomBytes(4).readUInt32BE();

    const claim: ReductionClaim = {
      user: userAddress,
      daoId,
      amount: amountGrams,
      evidenceHash,
      nonce,
      expiresAt,
    };

    const wallet = getAttesterWallet();
    const domain = getDomain();

    const signature = await wallet.signTypedData(
      domain,
      CLAIM_TYPES,
      claim as unknown as Record<string, unknown>
    );

    const evidenceId = crypto.randomUUID();

    const result: EvidenceVerificationResult = {
      evidenceId,
      status: "approved",
      amountGrams,
      amountKg,
      reason:
        reason +
        (period
          ? `\n対象期間: ${period}`
          : ""),
      claim,
      signature,
    };

    // Server-side debug log for verification result
    console.log("[/api/evidence] result:", {
      evidenceId,
      claim,
      signature,
      amountKg,
      evidenceHash,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Error in /api/evidence:", err);
    const message =
      err instanceof Error
        ? err.message
        : "サーバー側でエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
