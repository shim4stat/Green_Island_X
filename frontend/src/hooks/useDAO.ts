"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllDAOs, getDAO, getUserContribution } from "@/lib/ethereum";
import type { SubDAO } from "@/types";

/**
 * 全 DAO リストを取得・管理するフック
 */
export function useDAOList() {
  const [daos, setDaos] = useState<SubDAO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDAOs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllDAOs();
      setDaos(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "DAO の取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDAOs();
  }, [fetchDAOs]);

  return {
    daos,
    isLoading,
    error,
    refetch: fetchDAOs,
  };
}

/**
 * 特定の DAO を取得・管理するフック
 */
export function useDAO(tokenId: number) {
  const [dao, setDao] = useState<SubDAO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDAO = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDAO(tokenId);
      setDao(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "DAO の取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    if (tokenId > 0) {
      fetchDAO();
    }
  }, [tokenId, fetchDAO]);

  return {
    dao,
    isLoading,
    error,
    refetch: fetchDAO,
  };
}

/**
 * ユーザーの貢献量を取得するフック
 */
export function useUserContribution(
  tokenId: number,
  userAddress: string | null
) {
  const [contribution, setContribution] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchContribution = async () => {
      if (!userAddress || tokenId <= 0) {
        setContribution(0);
        return;
      }

      setIsLoading(true);
      try {
        const amount = await getUserContribution(tokenId, userAddress);
        setContribution(amount);
      } catch (err) {
        console.error("貢献量の取得に失敗:", err);
        setContribution(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContribution();
  }, [tokenId, userAddress]);

  return {
    contribution,
    isLoading,
  };
}
