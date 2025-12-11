"use client";

import { useEffect, useRef, useState } from "react";
import { useWeb3, useContractWrite } from "@/hooks";
import type { EvidenceVerificationResult } from "@/types";

interface EvidenceContributionProps {
  tokenId: number;
  onSuccess?: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Evidence-based contribution component with local redaction.
 * UI text is Japanese, comments are English.
 */
export function EvidenceContribution({
  tokenId,
  onSuccess,
}: EvidenceContributionProps) {
  const { address, isConnected } = useWeb3();
  const { submitClaim, isPending, isSuccess, error, reset } =
    useContractWrite();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rects, setRects] = useState<Rect[]>([]);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<EvidenceVerificationResult | null>(
    null
  );
  const [estimatedKg, setEstimatedKg] = useState<string>("");
  const [evidenceType, setEvidenceType] = useState<string>("electricity");
  const [period, setPeriod] = useState<string>("");

  // Load selected image into canvas
  useEffect(() => {
    if (!originalFile || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const url = URL.createObjectURL(originalFile);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
      setRects([]);
      setCurrentRect(null);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [originalFile]);

  // Redraw canvas when rectangles change
  useEffect(() => {
    if (!canvasRef.current || !originalFile || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const url = URL.createObjectURL(originalFile);

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      rects.forEach((r) => {
        ctx.fillRect(r.x, r.y, r.width, r.height);
      });

      if (currentRect) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(
          currentRect.x,
          currentRect.y,
          currentRect.width,
          currentRect.height
        );
      }

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [rects, currentRect, originalFile, imageLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalFile(file);
    setResult(null);
    setApiError(null);
    reset();
  };

  const getCanvasPos = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentRect) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    const width = pos.x - currentRect.x;
    const height = pos.y - currentRect.y;

    setCurrentRect({
      x: currentRect.x,
      y: currentRect.y,
      width,
      height,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false);
      return;
    }

    const normalized: Rect = {
      x: Math.min(currentRect.x, currentRect.x + currentRect.width),
      y: Math.min(currentRect.y, currentRect.y + currentRect.height),
      width: Math.abs(currentRect.width),
      height: Math.abs(currentRect.height),
    };

    if (normalized.width > 5 && normalized.height > 5) {
      setRects((prev) => [...prev, normalized]);
    }

    setCurrentRect(null);
    setIsDrawing(false);
  };

  const handleResetMask = () => {
    setRects([]);
    setCurrentRect(null);
    setResult(null);
    setApiError(null);
    reset();
  };

  const handleUpload = async () => {
    if (!originalFile || !canvasRef.current || !address) return;

    setIsUploading(true);
    setApiError(null);
    setResult(null);

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });

      if (!blob) {
        throw new Error("画像の変換に失敗しました");
      }

      const redactedFile = new File([blob], "evidence-redacted.png", {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("daoId", String(tokenId));
      formData.append("userAddress", address);
      formData.append("evidenceImage", redactedFile);
      formData.append("evidenceType", evidenceType);
      if (period) {
        formData.append("period", period);
      }
      if (estimatedKg) {
        formData.append("estimatedKg", estimatedKg);
      }

      const res = await fetch("/api/evidence", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "証拠の送信に失敗しました");
      }

      const data = (await res.json()) as EvidenceVerificationResult;
      // Debug log for demo: show calculated result and claim/signature
      console.log("[EvidenceContribution] verification result:", data);
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "証拠の送信に失敗しました";
      setApiError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitOnChain = async () => {
    if (!result) return;

    try {
      await submitClaim(result.claim, result.signature);
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error is handled in hook
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        ウォレットを接続すると、証拠付きで削減量を記録できます。
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        📎 証拠付きで削減量を記録する
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        電気料金の明細や歩数スクリーンショット、太陽光発電の記録などの証拠をアップロードし、
        サービス側で算出した削減量をブロックチェーンに記録します。
        画像はアップロード前にブラウザ上でマスキングできます。
      </p>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            証拠画像（アップロード前にマスキング可能）
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-3 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
          />

          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-2">
            {originalFile ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  画像上でドラッグして、名前・住所・アカウント番号などの個人情報をマスキングしてください。
                </p>
                <div className="max-h-[400px] overflow-auto">
                  <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetMask}
                  className="text-xs text-gray-600 underline hover:text-gray-800"
                >
                  マスクをすべてリセットする
                </button>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                証拠画像を選択すると、ここにプレビューが表示されます。
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              証拠の種類
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              <option value="electricity">電気料金明細</option>
              <option value="transportation">歩数／移動手段の記録</option>
              <option value="solar">太陽光発電の記録</option>
              <option value="other">その他の証拠</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              対象期間（任意）
            </label>
            <input
              type="text"
              placeholder="例: 2025年1月分"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              おおよその削減量（自己申告・任意、kg）
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="例: 2.5"
              value={estimatedKg}
              onChange={(e) => setEstimatedKg(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="mt-1 text-xs text-gray-500">
              入力がない場合は、証拠の種類と期間に基づいたシンプルなルールで推定されます。
            </p>
          </div>

          {apiError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {apiError}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!originalFile || isUploading}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isUploading ? "証拠を解析中..." : "証拠をアップロードして削減量を計算する"}
          </button>

          {result && (
            <div className="mt-3 space-y-3 rounded-lg bg-white p-3 text-sm text-gray-800 shadow-sm">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  算出された削減量
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {result.amountKg.toFixed(3)} kg CO₂
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  算出の根拠
                </p>
                <p className="whitespace-pre-wrap text-xs text-gray-600">
                  {result.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmitOnChain}
                disabled={isPending}
                className="mt-2 w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isPending
                  ? "ブロックチェーンに記録中..."
                  : "この結果をブロックチェーンに記録する"}
              </button>
              {isSuccess && (
                <p className="mt-1 text-xs text-green-700">
                  ブロックチェーンへの記録が完了しました。
                </p>
              )}
              {error && (
                <p className="mt-1 text-xs text-red-700">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
