"use client";

import { useState } from "react";
import { useContractWrite } from "@/hooks";

interface ContributionFormProps {
  tokenId: number;
  isCompleted: boolean;
  onSuccess?: () => void;
}

export function ContributionForm({
  tokenId,
  isCompleted,
  onSuccess,
}: ContributionFormProps) {
  const [amount, setAmount] = useState("");
  const { contribute, isPending, isSuccess, error, reset } = useContractWrite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountKg = parseFloat(amount);
    if (isNaN(amountKg) || amountKg <= 0) {
      return;
    }

    try {
      await contribute(tokenId, amountKg);
      setAmount("");
      onSuccess?.();
    } catch {
      // エラーは useContractWrite 内で処理済み
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-medium text-green-800">記録が完了しました！</p>
            <p className="text-sm text-green-600">
              あなたの貢献が DAO に反映されました
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="mt-3 text-sm text-green-700 underline hover:text-green-800"
        >
          続けて記録する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="contribution-amount"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          CO₂ 削減量を入力（kg）
        </label>
        <div className="relative">
          <input
            type="number"
            id="contribution-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 2.5"
            step="0.1"
            min="0"
            disabled={isPending || isCompleted}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-lg transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            kg
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          ※ 削減活動を自己申告で入力してください
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || isCompleted || !amount}
        className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            処理中...
          </span>
        ) : isCompleted ? (
          "この DAO は達成済みです"
        ) : (
          "🌿 記録する"
        )}
      </button>
    </form>
  );
}
