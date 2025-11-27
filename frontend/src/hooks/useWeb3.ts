"use client";

import { useState, useEffect, useCallback } from "react";
import {
  connectWallet,
  getWalletState,
  switchNetwork,
  isSupportedChain,
  shortenAddress,
} from "@/lib/ethereum";
import { DEFAULT_CHAIN_ID } from "@/lib/abi";
import type { WalletState } from "@/types";

/**
 * Web3 ウォレット接続を管理するカスタムフック
 */
export function useWeb3() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期化時にウォレット状態を確認
  useEffect(() => {
    const initWallet = async () => {
      try {
        const state = await getWalletState();
        setWalletState(state);
      } catch (err) {
        console.error("ウォレット状態の取得に失敗:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initWallet();
  }, []);

  // ウォレットイベントのリスナー設定
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        setWalletState({ isConnected: false, address: null, chainId: null });
      } else {
        setWalletState((prev) => ({
          ...prev,
          isConnected: true,
          address: accountList[0],
        }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      const newChainId = parseInt(chainId as string, 16);
      setWalletState((prev) => ({ ...prev, chainId: newChainId }));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ウォレット接続
  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await connectWallet();

      // 常にデフォルトチェーンに切り替え（ローカル開発時は localhost:8545）
      if (result.chainId !== DEFAULT_CHAIN_ID) {
        console.log(
          `Switching from chain ${result.chainId} to ${DEFAULT_CHAIN_ID}`
        );
        await switchNetwork(DEFAULT_CHAIN_ID);
        // ネットワーク切り替え後のchainIdを取得
        const newChainId = await window.ethereum!.request({
          method: "eth_chainId",
        });
        setWalletState({
          isConnected: true,
          address: result.address,
          chainId: parseInt(newChainId as string, 16),
        });
      } else {
        setWalletState({
          isConnected: true,
          address: result.address,
          chainId: result.chainId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "接続に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 切断（実際にはメタデータのクリアのみ）
  const disconnect = useCallback(() => {
    setWalletState({ isConnected: false, address: null, chainId: null });
  }, []);

  // デフォルトネットワークに切り替え
  const switchToDefaultChain = useCallback(async () => {
    setError(null);
    try {
      await switchNetwork(DEFAULT_CHAIN_ID);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "ネットワーク切り替えに失敗しました";
      setError(message);
    }
  }, []);

  return {
    ...walletState,
    isLoading,
    error,
    connect,
    disconnect,
    switchToDefaultChain,
    shortenedAddress: walletState.address
      ? shortenAddress(walletState.address)
      : null,
    isCorrectNetwork: walletState.chainId
      ? isSupportedChain(walletState.chainId)
      : false,
  };
}
