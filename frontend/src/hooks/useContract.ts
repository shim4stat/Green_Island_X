"use client";

import { useState, useCallback } from "react";
import {
  createSubDAO as createSubDAOContract,
  contribute as contributeContract,
  splitDAO as splitDAOContract,
  kgToGrams,
} from "@/lib/ethereum";
import type { TransactionStatus } from "@/types";

/**
 * コントラクトへの書き込み操作を管理するフック
 */
export function useContractWrite() {
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // 状態のリセット
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  // SubDAO 作成
  const createSubDAO = useCallback(
    async (
      title: string,
      description: string,
      targetAmountKg: number,
      uncompletedURI: string,
      completedURI: string
    ) => {
      reset();
      setStatus("pending");

      try {
        const targetAmountGrams = kgToGrams(targetAmountKg);
        const receipt = await createSubDAOContract(
          title,
          description,
          targetAmountGrams,
          uncompletedURI,
          completedURI
        );
        setTxHash(receipt.hash);
        setStatus("success");
        return receipt;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "トランザクションに失敗しました";
        setError(message);
        setStatus("error");
        throw err;
      }
    },
    [reset]
  );

  // 貢献記録
  const contribute = useCallback(
    async (tokenId: number, amountKg: number) => {
      reset();
      setStatus("pending");

      try {
        const amountGrams = kgToGrams(amountKg);
        const receipt = await contributeContract(tokenId, amountGrams);
        setTxHash(receipt.hash);
        setStatus("success");
        return receipt;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "トランザクションに失敗しました";
        setError(message);
        setStatus("error");
        throw err;
      }
    },
    [reset]
  );

  // DAO 分割
  const splitDAO = useCallback(
    async (originalTokenId: number) => {
      reset();
      setStatus("pending");

      try {
        const receipt = await splitDAOContract(originalTokenId);
        setTxHash(receipt.hash);
        setStatus("success");
        return receipt;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "トランザクションに失敗しました";
        setError(message);
        setStatus("error");
        throw err;
      }
    },
    [reset]
  );

  return {
    status,
    error,
    txHash,
    reset,
    createSubDAO,
    contribute,
    splitDAO,
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
  };
}
