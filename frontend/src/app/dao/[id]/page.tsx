"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ProgressBar,
  ContributionForm,
  ConfettiTrigger,
  LoadingSpinner,
} from "@/components";
import {
  useDAO,
  useUserContribution,
  useWeb3,
  useContractWrite,
} from "@/hooks";
import { ipfsToHttpUrl } from "@/lib/ipfs";
import { shortenAddress, gramsToKg } from "@/lib/ethereum";

export default function DAODetailPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = Number(params.id);

  const { dao, isLoading, error, refetch } = useDAO(tokenId);
  const { address, isConnected } = useWeb3();
  const { contribution } = useUserContribution(tokenId, address);
  const { splitDAO, isPending: isSplitting } = useContractWrite();

  // 達成時の紙吹雪トリガー
  const [showConfetti, setShowConfetti] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(false);

  // 達成状態の変化を検出
  useEffect(() => {
    if (dao) {
      if (dao.isCompleted && !wasCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      setWasCompleted(dao.isCompleted);
    }
  }, [dao, wasCompleted]);

  const handleSplitDAO = async () => {
    if (!dao) return;

    const confirmed = window.confirm(
      "この DAO を細胞分裂させますか？\n新しい DAO が同じ目標で作成されます。"
    );

    if (confirmed) {
      try {
        await splitDAO(tokenId);
        router.push("/");
      } catch {
        // エラーは hook 内で処理済み
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" message="DAO を読み込み中..." />
      </div>
    );
  }

  if (error || !dao) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-lg bg-red-50 p-8 text-center">
          <span className="text-4xl">😵</span>
          <h2 className="mt-4 text-xl font-semibold text-red-800">
            DAO が見つかりません
          </h2>
          <p className="mt-2 text-red-600">
            {error || "指定された ID の DAO は存在しません"}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = address?.toLowerCase() === dao.admin.toLowerCase();
  const imageUrl = dao.isCompleted
    ? ipfsToHttpUrl(dao.completedImageURI)
    : ipfsToHttpUrl(dao.uncompletedImageURI);

  return (
    <>
      <ConfettiTrigger trigger={showConfetti} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            ← ダッシュボードに戻る
          </Link>
        </nav>

        {/* Main Content */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          {/* Image Section */}
          <div className="relative aspect-video bg-gray-100">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={dao.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-8xl">
                  {dao.isCompleted ? "🌳" : "🌱"}
                </span>
              </div>
            )}

            {/* Status Overlay */}
            {dao.isCompleted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="rounded-2xl bg-green-500 px-8 py-4 text-center text-white shadow-lg">
                  <span className="text-4xl">🎉</span>
                  <p className="mt-2 text-2xl font-bold">目標達成！</p>
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {dao.parentId > 0 && (
                <Link
                  href={`/dao/${dao.parentId}`}
                  className="rounded-full bg-purple-500 px-3 py-1 text-sm font-medium text-white hover:bg-purple-600"
                >
                  🧬 親DAO: #{dao.parentId}
                </Link>
              )}
            </div>

            <div className="absolute right-4 top-4">
              <span
                className={`rounded-full px-4 py-2 text-sm font-medium text-white ${
                  dao.isCompleted ? "bg-green-500" : "bg-blue-500"
                }`}
              >
                Token ID: #{dao.tokenId}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 md:p-8">
            {/* Title & Admin */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {dao.title}
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  管理者: {shortenAddress(dao.admin)}
                  {isAdmin && (
                    <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      あなた
                    </span>
                  )}
                </p>
              </div>
              {isAdmin && dao.isCompleted && (
                <button
                  onClick={handleSplitDAO}
                  disabled={isSplitting}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSplitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      処理中...
                    </>
                  ) : (
                    <>🧬 細胞分裂させる</>
                  )}
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                ストーリー
              </h2>
              <p className="whitespace-pre-wrap text-gray-600">
                {dao.description}
              </p>
            </div>

            {/* Progress Section */}
            <div className="mb-8 rounded-xl bg-gray-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                📊 進捗状況
              </h2>
              <ProgressBar
                current={dao.currentAmount}
                target={dao.targetAmount}
                size="lg"
              />
              <div className="mt-4 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {gramsToKg(dao.currentAmount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">現在の削減量 (kg)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">
                    {gramsToKg(dao.targetAmount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">目標削減量 (kg)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {((dao.currentAmount / dao.targetAmount) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">達成率</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {gramsToKg(contribution).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">あなたの貢献 (kg)</p>
                </div>
              </div>
            </div>

            {/* Contribution Form */}
            {isConnected ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  🌿 活動を記録する
                </h2>
                <ContributionForm
                  tokenId={tokenId}
                  isCompleted={dao.isCompleted}
                  onSuccess={refetch}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-gray-600">
                  貢献を記録するにはウォレットを接続してください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
