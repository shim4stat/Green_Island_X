/**
 * IPFS / Pinata ユーティリティ
 * 画像を IPFS にアップロードする機能を提供
 */

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || "";
const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
  "https://gateway.pinata.cloud/ipfs/";

/**
 * Pinata が設定されているかチェック
 */
export function isPinataConfigured(): boolean {
  return !!(PINATA_API_KEY && PINATA_SECRET_KEY);
}

/**
 * ファイルを Pinata にアップロード
 */
export async function uploadToPinata(file: File): Promise<string> {
  if (!isPinataConfigured()) {
    throw new Error(
      "Pinata API キーが設定されていません。.env.local を確認してください。"
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", options);

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Pinata アップロードエラー: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * JSON メタデータを Pinata にアップロード
 */
export async function uploadJSONToPinata(
  json: Record<string, unknown>,
  name: string
): Promise<string> {
  if (!isPinataConfigured()) {
    throw new Error(
      "Pinata API キーが設定されていません。.env.local を確認してください。"
    );
  }

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Pinata JSON アップロードエラー: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * IPFS URI を HTTP ゲートウェイ URL に変換
 */
export function ipfsToHttpUrl(ipfsUri: string): string {
  if (!ipfsUri) return "";

  // すでに HTTP URL の場合はそのまま返す
  if (ipfsUri.startsWith("http://") || ipfsUri.startsWith("https://")) {
    return ipfsUri;
  }

  // ipfs:// 形式を HTTP ゲートウェイ URL に変換
  if (ipfsUri.startsWith("ipfs://")) {
    const cid = ipfsUri.replace("ipfs://", "");
    return `${PINATA_GATEWAY}${cid}`;
  }

  // CID のみの場合
  return `${PINATA_GATEWAY}${ipfsUri}`;
}

/**
 * 画像ファイルのプレビュー URL を生成
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * プレビュー URL を解放
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
