"use client";

import Link from "next/link";
import { useWeb3 } from "@/hooks";

export function Header() {
  const {
    isConnected,
    shortenedAddress,
    isCorrectNetwork,
    connect,
    disconnect,
    switchToDefaultChain,
    isLoading,
    error,
  } = useWeb3();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-green-700">EcoDAO</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-gray-800 font-medium transition-colors hover:text-green-600"
          >
            ダッシュボード
          </Link>
          <Link
            href="/create"
            className="text-gray-800 font-medium transition-colors hover:text-green-600"
          >
            DAO を作成
          </Link>
        </nav>

        {/* Wallet Connection */}
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-500">{error}</span>}

          {isConnected ? (
            <div className="flex items-center gap-3">
              {!isCorrectNetwork && (
                <button
                  onClick={switchToDefaultChain}
                  className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-200"
                >
                  ネットワーク切替
                </button>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-green-700">
                  {shortenedAddress}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                切断
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isLoading}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "接続中..." : "ウォレット接続"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
