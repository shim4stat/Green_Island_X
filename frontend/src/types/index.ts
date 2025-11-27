/**
 * SubDAO データ構造
 * スマートコントラクトの SubDAO 構造体に対応
 */
export interface SubDAO {
  tokenId: number;
  title: string;
  description: string;
  targetAmount: number; // グラム単位
  currentAmount: number; // グラム単位
  uncompletedImageURI: string;
  completedImageURI: string;
  isCompleted: boolean;
  parentId: number; // 0 の場合は Origin（親なし）
  admin: string; // 管理者のウォレットアドレス
}

/**
 * 貢献記録
 */
export interface Contribution {
  contributor: string;
  amount: number; // グラム単位
}

/**
 * DAO 作成フォームの入力データ
 */
export interface CreateDAOInput {
  title: string;
  description: string;
  targetAmountKg: number; // kg 単位（UI 入力用）
  uncompletedImageURI: string;
  completedImageURI: string;
}

/**
 * ウォレット接続状態
 */
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
}

/**
 * トランザクション状態
 */
export type TransactionStatus = "idle" | "pending" | "success" | "error";

/**
 * NFT メタデータ（OpenSea 標準準拠）
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
  unit?: string;
}

/**
 * コントラクトイベント
 */
export interface DAOCreatedEvent {
  tokenId: number;
  admin: string;
  title: string;
  targetAmount: number;
}

export interface ContributionReceivedEvent {
  tokenId: number;
  contributor: string;
  amount: number;
  totalAmount: number;
}

export interface DAOCompletedEvent {
  tokenId: number;
  finalAmount: number;
}

export interface DAOSplitEvent {
  oldTokenId: number;
  newTokenId: number;
  newAdmin: string;
}
