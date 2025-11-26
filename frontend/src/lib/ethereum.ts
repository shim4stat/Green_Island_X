import { ethers } from "ethers";
import {
  ECODAO_ABI,
  CONTRACT_ADDRESS,
  SUPPORTED_CHAIN_IDS,
  CHAIN_INFO,
  DEFAULT_CHAIN_ID,
} from "./abi";
import type { SubDAO } from "@/types";

/**
 * ブラウザプロバイダーを取得
 */
export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * ウォレット接続
 */
export async function connectWallet(): Promise<{
  address: string;
  chainId: number;
}> {
  const provider = getBrowserProvider();
  if (!provider) {
    throw new Error("MetaMask などのウォレットがインストールされていません");
  }

  const accounts = await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();

  return {
    address: accounts[0],
    chainId: Number(network.chainId),
  };
}

/**
 * 現在のウォレット状態を取得
 */
export async function getWalletState(): Promise<{
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
}> {
  const provider = getBrowserProvider();
  if (!provider) {
    return { isConnected: false, address: null, chainId: null };
  }

  try {
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length === 0) {
      return { isConnected: false, address: null, chainId: null };
    }

    const network = await provider.getNetwork();
    return {
      isConnected: true,
      address: accounts[0],
      chainId: Number(network.chainId),
    };
  } catch {
    return { isConnected: false, address: null, chainId: null };
  }
}

/**
 * ネットワーク切り替え
 */
export async function switchNetwork(chainId: number): Promise<void> {
  const provider = getBrowserProvider();
  if (!provider) {
    throw new Error("ウォレットが接続されていません");
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: chainIdHex },
    ]);
  } catch (error: unknown) {
    // チェーンが追加されていない場合は追加を試みる
    if ((error as { code?: number }).code === 4902) {
      const chainInfo = CHAIN_INFO[chainId as keyof typeof CHAIN_INFO];
      if (chainInfo) {
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: chainIdHex,
            chainName: chainInfo.name,
            rpcUrls: [chainInfo.rpcUrl],
            blockExplorerUrls: chainInfo.blockExplorer
              ? [chainInfo.blockExplorer]
              : [],
            nativeCurrency: chainInfo.currency,
          },
        ]);
      }
    } else {
      throw error;
    }
  }
}

/**
 * コントラクトインスタンスを取得（読み取り専用）
 */
export function getReadOnlyContract(): ethers.Contract | null {
  if (!CONTRACT_ADDRESS) {
    console.warn("CONTRACT_ADDRESS が設定されていません");
    return null;
  }

  const provider = getBrowserProvider();
  if (!provider) {
    return null;
  }

  return new ethers.Contract(CONTRACT_ADDRESS, ECODAO_ABI, provider);
}

/**
 * コントラクトインスタンスを取得（書き込み可能）
 * トランザクション前に正しいネットワークに接続されているか確認する
 */
export async function getWritableContract(): Promise<ethers.Contract> {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS が設定されていません");
  }

  const provider = getBrowserProvider();
  if (!provider) {
    throw new Error("ウォレットが接続されていません");
  }

  // 現在のネットワークを確認
  const network = await provider.getNetwork();
  const currentChainId = Number(network.chainId);

  // デフォルトチェーンに接続されていない場合は切り替え
  if (currentChainId !== DEFAULT_CHAIN_ID) {
    console.log(
      `Wrong network detected: ${currentChainId}. Switching to ${DEFAULT_CHAIN_ID}...`
    );
    await switchNetwork(DEFAULT_CHAIN_ID);
    // 切り替え後、プロバイダーを再取得して signer を取得
    const newProvider = getBrowserProvider();
    if (!newProvider) {
      throw new Error("ウォレットが接続されていません");
    }
    const signer = await newProvider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ECODAO_ABI, signer);
  }

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ECODAO_ABI, signer);
}

/**
 * 全ての DAO を取得
 */
export async function getAllDAOs(): Promise<SubDAO[]> {
  const contract = getReadOnlyContract();
  if (!contract) {
    return [];
  }

  try {
    const nextTokenId = await contract.getNextTokenId();
    const daos: SubDAO[] = [];

    for (let i = 1; i < Number(nextTokenId); i++) {
      try {
        const dao = await contract.daos(i);
        daos.push({
          tokenId: i,
          title: dao.title,
          description: dao.description,
          targetAmount: Number(dao.targetAmount),
          currentAmount: Number(dao.currentAmount),
          uncompletedImageURI: dao.uncompletedImageURI,
          completedImageURI: dao.completedImageURI,
          isCompleted: dao.isCompleted,
          parentId: Number(dao.parentId),
          admin: dao.admin,
        });
      } catch {
        // トークンが存在しない場合はスキップ
        continue;
      }
    }

    return daos;
  } catch (error) {
    console.error("DAO の取得に失敗しました:", error);
    return [];
  }
}

/**
 * 特定の DAO を取得
 */
export async function getDAO(tokenId: number): Promise<SubDAO | null> {
  const contract = getReadOnlyContract();
  if (!contract) {
    return null;
  }

  try {
    const dao = await contract.daos(tokenId);
    return {
      tokenId,
      title: dao.title,
      description: dao.description,
      targetAmount: Number(dao.targetAmount),
      currentAmount: Number(dao.currentAmount),
      uncompletedImageURI: dao.uncompletedImageURI,
      completedImageURI: dao.completedImageURI,
      isCompleted: dao.isCompleted,
      parentId: Number(dao.parentId),
      admin: dao.admin,
    };
  } catch (error) {
    console.error("DAO の取得に失敗しました:", error);
    return null;
  }
}

/**
 * ユーザーの貢献量を取得
 */
export async function getUserContribution(
  tokenId: number,
  address: string
): Promise<number> {
  const contract = getReadOnlyContract();
  if (!contract) {
    return 0;
  }

  try {
    const contribution = await contract.contributions(tokenId, address);
    return Number(contribution);
  } catch (error) {
    console.error("貢献量の取得に失敗しました:", error);
    return 0;
  }
}

/**
 * SubDAO を作成
 */
export async function createSubDAO(
  title: string,
  description: string,
  targetAmountGrams: number,
  uncompletedURI: string,
  completedURI: string
): Promise<ethers.TransactionReceipt> {
  const contract = await getWritableContract();
  const tx = await contract.createSubDAO(
    title,
    description,
    targetAmountGrams,
    uncompletedURI,
    completedURI
  );
  return await tx.wait();
}

/**
 * 貢献を記録
 */
export async function contribute(
  tokenId: number,
  amountGrams: number
): Promise<ethers.TransactionReceipt> {
  const contract = await getWritableContract();
  const tx = await contract.contribute(tokenId, amountGrams);
  return await tx.wait();
}

/**
 * DAO を分割
 */
export async function splitDAO(
  originalTokenId: number
): Promise<ethers.TransactionReceipt> {
  const contract = await getWritableContract();
  const tx = await contract.splitDAO(originalTokenId);
  return await tx.wait();
}

/**
 * サポートされているチェーンかどうかを確認
 */
export function isSupportedChain(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAIN_IDS).includes(
    chainId as (typeof SUPPORTED_CHAIN_IDS)[keyof typeof SUPPORTED_CHAIN_IDS]
  );
}

/**
 * アドレスを短縮表示
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * グラムをキログラムに変換
 */
export function gramsToKg(grams: number): number {
  return grams / 1000;
}

/**
 * キログラムをグラムに変換
 */
export function kgToGrams(kg: number): number {
  return Math.floor(kg * 1000);
}

// TypeScript の window.ethereum 型定義
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: unknown[]) => void
      ) => void;
    };
  }
}
