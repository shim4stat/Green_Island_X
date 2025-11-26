"use client";

import { useState } from "react";
import Link from "next/link";
import { DAOCard, LoadingSpinner, EmptyState } from "@/components";
import { useDAOList, useWeb3 } from "@/hooks";
import { CONTRACT_ADDRESS } from "@/lib/abi";

type FilterType = "all" | "active" | "completed";

export default function HomePage() {
  const { daos, isLoading, error, refetch } = useDAOList();
  const { isConnected } = useWeb3();
  const [filter, setFilter] = useState<FilterType>("all");

  // フィルタリング
  const filteredDAOs = daos.filter((dao) => {
    if (filter === "active") return !dao.isCompleted;
    if (filter === "completed") return dao.isCompleted;
    return true;
  });

  // コントラクト未設定時の警告
  const isContractConfigured = !!CONTRACT_ADDRESS;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">🌿 EcoDAO</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          個人のCO₂削減活動をブロックチェーン上で可視化・資産化。
          <br />
          みんなの小さな努力が、大きな環境貢献へ。
        </p>
      </div>

      {/* Warning Banner */}
      {!isContractConfigured && (
        <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-medium text-yellow-800">
                コントラクトが未設定です
              </h3>
              <p className="text-sm text-yellow-700">
                <code className="rounded bg-yellow-100 px-1">.env.local</code>{" "}
                に{" "}
                <code className="rounded bg-yellow-100 px-1">
                  NEXT_PUBLIC_CONTRACT_ADDRESS
                </code>{" "}
                を設定してください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="mb-8 rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
          <p className="text-blue-800">
            ウォレットを接続すると、DAO への参加や貢献記録ができます
          </p>
        </div>
      )}

      {/* Action Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f === "all" && "すべて"}
              {f === "active" && "🌱 進行中"}
              {f === "completed" && "✓ 達成済み"}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={refetch}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            🔄 更新
          </button>
          <Link
            href="/create"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
          >
            + 新しい DAO を作成
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="DAO を読み込み中..." />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 text-sm text-red-600 underline hover:text-red-800"
          >
            再試行
          </button>
        </div>
      ) : filteredDAOs.length === 0 ? (
        <EmptyState
          title={
            filter === "all"
              ? "まだ DAO がありません"
              : filter === "active"
              ? "進行中の DAO はありません"
              : "達成済みの DAO はありません"
          }
          description={
            filter === "all"
              ? "最初の DAO を作成して、CO₂ 削減活動を始めましょう！"
              : "フィルターを変更するか、新しい DAO を作成してください。"
          }
          action={
            filter === "all"
              ? { label: "DAO を作成", href: "/create" }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDAOs.map((dao) => (
            <DAOCard key={dao.tokenId} dao={dao} />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {daos.length > 0 && (
        <div className="mt-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white shadow-lg">
          <h2 className="mb-4 text-center text-xl font-bold">
            🌍 全体の削減実績
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{daos.length}</p>
              <p className="text-sm opacity-80">DAO 数</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {(
                  daos.reduce((sum, d) => sum + d.currentAmount, 0) / 1000
                ).toFixed(1)}
              </p>
              <p className="text-sm opacity-80">削減量 (kg)</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {daos.filter((d) => d.isCompleted).length}
              </p>
              <p className="text-sm opacity-80">達成済み</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
