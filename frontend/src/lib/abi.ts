/**
 * EcoDAO コントラクト ABI
 * ドキュメントの詳細設計書に基づいて定義
 */
export const ECODAO_ABI = [
  // ===== Read Functions =====

  // ERC721 標準
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",

  // SubDAO 情報取得
  "function daos(uint256 tokenId) view returns (string title, string description, uint256 targetAmount, uint256 currentAmount, string uncompletedImageURI, string completedImageURI, bool isCompleted, uint256 parentId, address admin)",
  "function contributions(uint256 tokenId, address contributor) view returns (uint256)",
  "function daoMembers(uint256 tokenId, uint256 index) view returns (address)",

  // 次のトークンID取得（内部カウンター）
  "function getNextTokenId() view returns (uint256)",

  // ===== Write Functions =====

  // DAO 作成
  "function createSubDAO(string title, string description, uint256 targetAmount, string uncompletedURI, string completedURI) returns (uint256)",

  // 貢献記録
  "function contribute(uint256 tokenId, uint256 amount)",

  // DAO 分割
  "function splitDAO(uint256 originalTokenId) returns (uint256)",

  // ===== Events =====
  "event DAOCreated(uint256 indexed tokenId, address indexed admin, string title, uint256 targetAmount)",
  "event ContributionReceived(uint256 indexed tokenId, address indexed contributor, uint256 amount, uint256 totalAmount)",
  "event DAOCompleted(uint256 indexed tokenId, uint256 finalAmount)",
  "event DAOSplit(uint256 indexed oldTokenId, uint256 indexed newTokenId, address indexed newAdmin)",

  // ERC721 標準イベント
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
] as const;

/**
 * コントラクトアドレス
 * デプロイ後に .env.local で上書き
 */
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

/**
 * サポートするチェーン ID
 */
export const SUPPORTED_CHAIN_IDS = {
  SEPOLIA: 11155111,
  LOCALHOST: 31337,
} as const;

/**
 * デフォルトのチェーンID
 * ローカル開発時は 31337 (Anvil)、本番は 11155111 (Sepolia)
 */
export const DEFAULT_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || SUPPORTED_CHAIN_IDS.LOCALHOST
);

/**
 * チェーン情報
 */
export const CHAIN_INFO = {
  [SUPPORTED_CHAIN_IDS.SEPOLIA]: {
    name: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/",
    blockExplorer: "https://sepolia.etherscan.io",
    currency: {
      name: "Sepolia ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },
  [SUPPORTED_CHAIN_IDS.LOCALHOST]: {
    name: "Localhost (Anvil)",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    currency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },
} as const;
