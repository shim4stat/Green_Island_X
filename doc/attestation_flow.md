# 証拠アップロード → 署名 → オンチェーン記録フロー

> EcoDAO における証拠ベースの CO₂ 削減量記録システムの完全な実装ガイド

## 📋 目次

- [全体フロー図](#全体フロー図)
- [技術アーキテクチャ](#技術アーキテクチャ)
- [実装の詳細](#実装の詳細)
- [セキュリティ機構](#セキュリティ機構)
- [3つのユースケース](#3つのユースケース)
- [環境変数設定](#環境変数設定)

---

## 🔄 全体フロー図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    1️⃣  フロントエンド：証拠のアップロード                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
    ユーザーが画像を選択（電気料金明細/歩数/太陽光発電）
                │
                ↓
    ┌───────────────────────────────┐
    │  ローカル Canvas でプレビュー    │  ← 元画像はブラウザ内のみ
    │  + マスキング処理               │
    │  - マウスで矩形を描画           │
    │  - 黒色で個人情報を覆う         │
    └───────────────────────────────┘
                │
                ↓
    マスキング済み画像を Blob に変換
                │
                ↓
    FormData を構築：
    {
      daoId: number,
      userAddress: string,
      evidenceImage: File (マスキング済み),
      evidenceType: "electricity" | "transportation" | "solar",
      period?: string,
      estimatedKg?: number
    }
                │
                ↓
    POST /api/evidence
                │
                │
┌───────────────────────────────────────────────────────────────────────────┐
│              2️⃣  バックエンド：検証と署名（Next.js API）                    │
└───────────────────────────────────────────────────────────────────────────┘
                │
                ↓
    ┌─────────────────────────┐
    │ マスキング済み画像を受信  │
    │ evidenceHash を計算      │  SHA-256(画像Buffer)
    └─────────────────────────┘
                │
                ↓
    ┌─────────────────────────┐
    │ OCR で文字認識           │
    │ - OCR API を呼び出し     │  (ocr.space など)
    │ - キーデータを抽出       │
    └─────────────────────────┘
                │
                ↓
    ┌──────────────────────────────────────────┐
    │ 証拠タイプ別に削減量を計算                │
    ├──────────────────────────────────────────┤
    │ electricity: kWh 抽出 → kg CO₂          │
    │   - "XXX kWh" または "XXX 円" を検索    │
    │   - 排出係数 (0.5 kg/kWh) を使用        │
    │                                          │
    │ transportation: 歩数抽出 → kg CO₂       │
    │   - "XXXX 歩" を検索                     │
    │   - 歩幅 × 歩数 = 距離                   │
    │   - 距離 × 車の排出係数                  │
    │                                          │
    │ solar: 発電量抽出 → kg CO₂               │
    │   - "XXX kWh" を検索                     │
    │   - 発電量 × 排出係数                    │
    └──────────────────────────────────────────┘
                │
                ↓
    ┌─────────────────────────┐
    │ Claim 構造体を生成       │
    └─────────────────────────┘
    {
      user: "0x...",          // ユーザーアドレス
      daoId: 1,               // DAO ID
      amount: 2500,           // 削減量（グラム）
      evidenceHash: "0x...",  // 画像ハッシュ
      nonce: 12345,           // ランダム値（リプレイ攻撃防止）
      expiresAt: 1750000000   // 有効期限（30日後）
    }
                │
                ↓
    ┌─────────────────────────────────────────┐
    │ EIP-712 署名                             │
    ├─────────────────────────────────────────┤
    │ Domain:                                 │
    │   name: "EcoDAO"                        │
    │   version: "1"                          │
    │   chainId: 80002 (Polygon Amoy)         │
    │   verifyingContract: CONTRACT_ADDRESS   │
    │                                         │
    │ Types: Claim 構造体定義                  │
    │                                         │
    │ Value: 上記の claim オブジェクト         │
    │                                         │
    │ Signer: ATTESTER_PRIVATE_KEY            │
    └─────────────────────────────────────────┘
                │
                ↓
    署名を生成: "0x..."
                │
                ↓
    フロントエンドへレスポンス返却：
    {
      evidenceId: "uuid",
      status: "approved",
      amountGrams: 2500,
      amountKg: 2.5,
      reason: "電気料金の明細から...",
      claim: { ... },
      signature: "0x..."
    }
                │
                │
┌───────────────────────────────────────────────────────────────────────────┐
│                  3️⃣  フロントエンド：結果表示 + オンチェーン                │
└───────────────────────────────────────────────────────────────────────────┘
                │
                ↓
    算出結果を表示：
    ✅ 算出された削減量: 2.5 kg CO₂
    📝 算出の根拠: "電気料金明細から 5 kWh..."
                │
                ↓
    ユーザーがクリック：「この結果をブロックチェーンに記録する」
                │
                ↓
    スマートコントラクトを呼び出し：
    EcoDAO.submitClaim(
      claim.user,
      claim.daoId,
      claim.amount,
      claim.evidenceHash,
      claim.nonce,
      claim.expiresAt,
      signature
    )
                │
                │
┌───────────────────────────────────────────────────────────────────────────┐
│                  4️⃣  スマートコントラクト：署名検証と記録                   │
└───────────────────────────────────────────────────────────────────────────┘
                │
                ↓
    ┌────────────────────────────┐
    │ 検証 1: 有効期限チェック     │
    │ require(block.timestamp     │
    │   <= expiresAt)             │
    └────────────────────────────┘
                │
                ↓
    ┌────────────────────────────┐
    │ 検証 2: nonce 未使用確認     │
    │ require(!usedNonce[nonce])  │
    └────────────────────────────┘
                │
                ↓
    ┌────────────────────────────┐
    │ 検証 3: EIP-712 署名復元     │
    │ - structHash を構築         │
    │ - digest を構築             │
    │ - ECDSA で署名者を復元      │
    │ - require(signer ==         │
    │     verifier)               │
    └────────────────────────────┘
                │
                ↓
    ┌────────────────────────────┐
    │ 検証 4: 呼び出し者確認       │
    │ require(user == msg.sender) │
    └────────────────────────────┘
                │
                ↓
    nonce を使用済みにマーク
    usedNonce[nonce] = true;
                │
                ↓
    DAO 貢献状態を更新
    _contribute(user, daoId, amount)
                │
                ↓
    イベント発行
    emit ContributionReceived(...)
                │
                ↓
    ✅ トランザクション完了！

┌───────────────────────────────────────────────────────────────────────────┐
│                        5️⃣  フロントエンド：UI 更新                         │
└───────────────────────────────────────────────────────────────────────────┘
                │
                ↓
    DAO データを再取得
    - currentAmount 増加
    - プログレスバー更新
    - ユーザー貢献量更新
```

---

## 🏗️ 技術アーキテクチャ

### システム構成

```
┌──────────────────────────────────────────────────────────┐
│                    フロントエンド                          │
│  (Next.js 16 + React + TypeScript + Tailwind CSS)       │
├──────────────────────────────────────────────────────────┤
│  • EvidenceContribution.tsx   証拠アップロードコンポーネント │
│  • useWeb3.ts                 ウォレット接続フック         │
│  • useContract.ts             コントラクト書き込みフック    │
│  • ethereum.ts                Web3 ユーティリティ          │
└──────────────────────────────────────────────────────────┘
                         ↕ HTTP (POST /api/evidence)
┌──────────────────────────────────────────────────────────┐
│                     バックエンド API                       │
│         (Next.js API Routes + Node.js)                   │
├──────────────────────────────────────────────────────────┤
│  • /api/evidence/route.ts     証拠検証 & 署名 API         │
│  • OCR サービス連携           (ocr.space など)            │
│  • EIP-712 署名生成           (ethers.js)                 │
│  • 削減量自動計算ロジック                                  │
└──────────────────────────────────────────────────────────┘
                         ↕ JSON-RPC
┌──────────────────────────────────────────────────────────┐
│                 ブロックチェーンレイヤー                    │
│              (Polygon Amoy Testnet)                      │
├──────────────────────────────────────────────────────────┤
│  • EcoDAO.sol                 メインコントラクト          │
│  • submitClaim()              証拠ベース貢献記録          │
│  • ECDSA 署名検証             (OpenZeppelin)              │
│  • Nonce 管理                 リプレイ攻撃防止            │
└──────────────────────────────────────────────────────────┘
```

---

## 💻 実装の詳細

### 1. フロントエンド：ローカルマスキング

**対象ファイル：** `frontend/src/components/EvidenceContribution.tsx`

```typescript
// Canvas を使用して画像をマスキング
const canvas = canvasRef.current;
const ctx = canvas.getContext("2d");

// 元画像を描画
ctx.drawImage(img, 0, 0);

// ユーザーが描いた矩形領域を黒で塗りつぶす
rects.forEach((r) => {
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";  // 黒色マスク
  ctx.fillRect(r.x, r.y, r.width, r.height);
});

// マスキング済み画像を Blob として出力
canvas.toBlob((blob) => {
  const redactedFile = new File([blob], "evidence-redacted.png");
  // このマスキング済みファイルのみをアップロード
});
```

**重要ポイント：**
- 元画像はブラウザのメモリ内にのみ保持
- サーバーへはマスキング済み画像のみ送信
- `URL.revokeObjectURL()` でメモリを適切に解放

---

### 2. バックエンド：OCR と削減量計算

**対象ファイル：** `frontend/src/app/api/evidence/route.ts`

#### 電気料金明細の処理

```typescript
function estimateFromElectricityBill(ocrText: string) {
  // "123 kWh" または "4560 円" を検索
  const kwhMatch = ocrText.match(/([\d,.]+)\s*kWh/i);
  const yenMatch = ocrText.match(/([\d,]+)\s*[円圓]/);

  let usedKwh: number;

  if (kwhMatch) {
    usedKwh = Number(kwhMatch[1].replace(/,/g, ''));
  } else if (yenMatch) {
    const yen = Number(yenMatch[1].replace(/,/g, ''));
    usedKwh = yen / UNIT_PRICE_YEN_PER_KWH;  // 30円/kWh
  }

  // 排出係数を適用
  const kg = usedKwh * EMISSION_FACTOR;  // 0.5 kg CO₂/kWh
  const grams = Math.floor(kg * 1000);

  return {
    amountGrams: grams,
    amountKg: kg,
    reason: `電気料金の明細から ${usedKwh} kWh × ${EMISSION_FACTOR} kg/kWh = ${kg} kg CO₂`
  };
}
```

#### 歩数の処理

```typescript
function estimateFromSteps(ocrText: string) {
  // "10,000 歩" を検索
  const stepMatch = ocrText.match(/([\d,]+)\s*(歩|steps?)/i);
  const steps = Number(stepMatch[1].replace(/,/g, ''));

  // 距離を計算
  const distanceKm = (steps * STEP_LENGTH_M) / 1000;  // 0.7m/歩

  // 車の排出量と比較
  const kg = distanceKm * CAR_EMISSION_KG_PER_KM;  // 0.2 kg/km

  return {
    amountGrams: Math.floor(kg * 1000),
    amountKg: kg,
    reason: `${steps} 歩 → ${distanceKm} km → ${kg} kg CO₂ 削減`
  };
}
```

---

### 3. バックエンド：EIP-712 署名

**対象ファイル：** `frontend/src/app/api/evidence/route.ts`

```typescript
// Domain 定義
const domain = {
  name: "EcoDAO",
  version: "1",
  chainId: 80002,  // Polygon Amoy
  verifyingContract: CONTRACT_ADDRESS
};

// Type 定義
const types = {
  Claim: [
    { name: "user", type: "address" },
    { name: "daoId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "expiresAt", type: "uint256" }
  ]
};

// Claim データ
const claim = {
  user: userAddress,
  daoId: tokenId,
  amount: amountGrams,
  evidenceHash: sha256Hex(imageBuffer),
  nonce: crypto.randomBytes(4).readUInt32BE(),
  expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30  // 30日後
};

// 署名
const wallet = new ethers.Wallet(ATTESTER_PRIVATE_KEY);
const signature = await wallet.signTypedData(domain, types, claim);
```

---

### 4. スマートコントラクト：署名検証

**対象ファイル：** `contract/src/EcoDAO.sol` (実装例)

```solidity
// EIP-712 ドメイン区切り文字
bytes32 public DOMAIN_SEPARATOR;

// Claim タイプハッシュ
bytes32 public constant CLAIM_TYPEHASH = keccak256(
  "Claim(address user,uint256 daoId,uint256 amount,bytes32 evidenceHash,uint256 nonce,uint256 expiresAt)"
);

// 使用済み nonce 管理
mapping(uint256 => bool) public usedNonce;

// 信頼する署名者（バックエンドの公開鍵）
address public verifier;

function submitClaim(
    address user,
    uint256 daoId,
    uint256 amount,
    bytes32 evidenceHash,
    uint256 nonce,
    uint256 expiresAt,
    bytes calldata signature
) external {
    // 1. 有効期限チェック
    require(block.timestamp <= expiresAt, "Claim expired");

    // 2. nonce 未使用チェック
    require(!usedNonce[nonce], "Nonce already used");

    // 3. 署名検証
    bytes32 structHash = keccak256(abi.encode(
        CLAIM_TYPEHASH,
        user,
        daoId,
        amount,
        evidenceHash,
        nonce,
        expiresAt
    ));

    bytes32 digest = keccak256(abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        structHash
    ));

    address signer = ECDSA.recover(digest, signature);
    require(signer == verifier, "Invalid signature");

    // 4. 呼び出し者確認
    require(user == msg.sender, "Unauthorized");

    // 5. nonce を使用済みにマーク
    usedNonce[nonce] = true;

    // 6. 貢献を記録
    _contribute(user, daoId, amount);

    emit ContributionReceived(daoId, user, amount, daos[daoId].currentAmount);
}
```

---

## 🛡️ セキュリティ機構

### セキュリティレイヤー

| 機構 | 説明 | 防止する攻撃 |
|------|------|------------|
| **ローカルマスキング** | 元画像は送信せずブラウザ内で処理 | プライバシー侵害 |
| **evidenceHash** | 画像内容の SHA-256 ハッシュ値 | 証拠データの改ざん |
| **nonce** | ワンタイムトークン（使い捨て番号） | リプレイ攻撃 |
| **expiresAt** | 署名の有効期限（30日間） | 期限切れ署名の不正利用 |
| **verifier** | 信頼できる署名者のみを許可 | 不正な署名の生成 |
| **msg.sender** | 本人のみが申請可能 | なりすまし・代理申請 |
| **EIP-712** | 型付き構造化データの署名 | クロスコントラクト攻撃 |

### 信頼モデル

```
┌─────────────────────────────────────────────────┐
│  ユーザーが信頼すべき要素                        │
├─────────────────────────────────────────────────┤
│  ✓ スマートコントラクトのコード（誰でも検証可能）│
│  ✓ verifier アドレス（デプロイ時に公開設定）    │
│  ✗ バックエンドのデータベース（信頼する必要なし）│
│  ✗ フロントエンドのコード（改ざん可能）          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  スマートコントラクトの検証項目                  │
├─────────────────────────────────────────────────┤
│  ✓ 署名者が verifier であること                 │
│  ✓ 署名の有効期限が切れていないこと              │
│  ✓ nonce が使用済みでないこと                   │
│  ✓ トランザクション送信者が claim.user と一致    │
└─────────────────────────────────────────────────┘
```

---

## 🎯 3つのユースケース

### ユースケース 1: 電気料金明細

```
【入力】
  ユーザー：電気料金明細の写真をアップロード
  マスキング：氏名、住所、口座番号を黒塗り

【処理】
  OCR：「使用量 150 kWh」を抽出
  計算：150 kWh × 0.5 kg/kWh = 75 kg CO₂

【出力】
  削減量：75 kg CO₂（75,000 グラム）
  根拠：「電気料金の明細から使用量 150 kWh を確認。
         排出係数 0.5 kg CO₂/kWh を適用し、75 kg の削減量を算出。」

【ブロックチェーンへの記録】
  submitClaim(...) を実行 → DAO の currentAmount が 75,000g 増加
```

---

### ユースケース 2: iPhone 歩数スクリーンショット

```
【入力】
  ユーザー：iPhone ヘルスケア App の歩数画面のスクリーンショット
  マスキング：ユーザー名を黒塗り

【処理】
  OCR：「10,000 歩」を抽出
  計算：
    歩行距離 = 10,000 歩 × 0.7m = 7 km
    削減量 = 7 km × 0.2 kg/km = 1.4 kg CO₂

【出力】
  削減量：1.4 kg CO₂（1,400 グラム）
  根拠：「歩数 10,000 歩から歩行距離 7 km を算出。
         自動車利用時の排出量（0.2 kg CO₂/km）と比較し、
         1.4 kg の CO₂ 削減効果があったと評価。」

【ブロックチェーンへの記録】
  submitClaim(...) を実行 → DAO の currentAmount が 1,400g 増加
```

---

### ユースケース 3: 太陽光発電モニター

```
【入力】
  ユーザー：インバーター画面または監視アプリのスクリーンショット
  マスキング：機器ID や設置住所を黒塗り

【処理】
  OCR：「Today: 8.5 kWh」を抽出
  計算：8.5 kWh × 0.5 kg/kWh = 4.25 kg CO₂

【出力】
  削減量：4.25 kg CO₂（4,250 グラム）
  根拠：「太陽光発電の記録から本日の発電量 8.5 kWh を確認。
         電力網の平均排出係数 0.5 kg CO₂/kWh と比較し、
         4.25 kg の CO₂ 削減効果を算出。」

【ブロックチェーンへの記録】
  submitClaim(...) を実行 → DAO の currentAmount が 4,250g 増加
```

---

## ⚙️ 環境変数設定

### フロントエンド (`.env.local`)

```bash
# ===== コントラクト設定 =====
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0c86A706D280357ea14b0e0613aD6942a08fd24B
NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002  # Polygon Amoy

# ===== IPFS / Pinata（オプション） =====
NEXT_PUBLIC_PINATA_API_KEY=your_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# ===== 認証サービス（バックエンド署名用）=====
ATTESTER_PRIVATE_KEY=0x337e19f3556c448d5a57d589b85bdc8401a8d534a167e531625863ea8d02e07c

# ===== OCR サービス =====
OCR_API_ENDPOINT=https://api.ocr.space/parse/image
OCR_API_KEY=K83988363588957

# ===== 排出係数 =====
EMISSION_FACTOR_KG_PER_KWH=0.5      # 電力排出係数（kg CO₂/kWh）
STEP_LENGTH_M=0.7                   # 歩幅（メートル）
CAR_EMISSION_KG_PER_KM=0.2          # 自動車排出係数（kg CO₂/km）
UNIT_PRICE_YEN_PER_KWH=30           # 電気料金単価（円/kWh）
```

---

## 📁 関連ファイル

### フロントエンド

| ファイル | 役割 |
|---------|------|
| `src/components/EvidenceContribution.tsx` | 証拠アップロード + マスキング UI |
| `src/hooks/useWeb3.ts` | ウォレット接続管理 |
| `src/hooks/useContract.ts` | コントラクト書き込みフック |
| `src/lib/ethereum.ts` | Web3 ユーティリティ関数 |
| `src/lib/abi.ts` | ABI とコントラクト設定 |
| `src/types/index.ts` | TypeScript 型定義 |

### バックエンド

| ファイル | 役割 |
|---------|------|
| `src/app/api/evidence/route.ts` | 証拠検証 & 署名 API |

### スマートコントラクト

| ファイル | 役割 |
|---------|------|
| `contract/src/EcoDAO.sol` | メインコントラクト |

---

## 🔍 技術用語集

### EIP-712
Ethereum Improvement Proposal 712。構造化データの署名標準。

**利点：**
- ウォレットで人間が読める形式で表示
- 型安全性
- ドメイン区切りによるリプレイ攻撃防止

**署名プロセス：**
```
1. domain を定義（name, version, chainId, verifyingContract）
2. types を定義（構造体のスキーマ）
3. value を定義（実際のデータ）
4. wallet.signTypedData(domain, types, value)
```

---

### Nonce（Number used ONCE）
一度だけ使用される数値。

**目的：**
- 同じ署名の再利用を防止
- リプレイ攻撃の防止

**実装：**
```solidity
mapping(uint256 => bool) public usedNonce;

require(!usedNonce[nonce], "Nonce already used");
usedNonce[nonce] = true;
```

---

### Evidence Hash
証拠画像の SHA-256 ハッシュ値。

**目的：**
- 証拠の改ざん検出
- 固定長データとしてブロックチェーンに記録

**計算：**
```typescript
const evidenceHash = "0x" +
  crypto.createHash("sha256")
    .update(imageBuffer)
    .digest("hex");
```

---

## 🚀 デプロイ手順

### 1. コントラクトのデプロイ

```bash
cd contract

# Attester ウォレットを生成（例）
# 公開鍵: 0xAttesterAddress...
# 秘密鍵: 0xAttesterPrivateKey...

# EcoDAO をデプロイ
forge create src/EcoDAO.sol:EcoDAO \
  --rpc-url https://rpc-amoy.polygon.technology \
  --private-key YOUR_DEPLOYER_KEY \
  --constructor-args YOUR_ADDRESS 0xAttesterAddress

# デプロイされたアドレスを記録
# → 0xEcoDaoAddress...
```

### 2. 環境変数の設定

```bash
cd ../frontend

# .env.local を作成
cat > .env.local << EOF
NEXT_PUBLIC_CONTRACT_ADDRESS=0xEcoDaoAddress
NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002
ATTESTER_PRIVATE_KEY=0xAttesterPrivateKey
OCR_API_ENDPOINT=https://api.ocr.space/parse/image
OCR_API_KEY=YOUR_OCR_KEY
EMISSION_FACTOR_KG_PER_KWH=0.5
STEP_LENGTH_M=0.7
CAR_EMISSION_KG_PER_KM=0.2
UNIT_PRICE_YEN_PER_KWH=30
EOF
```

### 3. フロントエンドの起動

```bash
npm install
npm run dev
```

### 4. 動作確認

1. http://localhost:3000 にアクセス
2. ウォレット接続（MetaMask）
3. Polygon Amoy ネットワークに切り替え
4. DAO を作成または既存 DAO を選択
5. 「証拠付きで削減量を記録する」をテスト

---

## 📊 データフロー

```
┌─────────────────────┐
│   元画像（ローカル）  │
│   - 電気料金明細      │
│   - 歩数スクリーン    │
│   - 発電量モニター    │
└─────────────────────┘
          ↓ Canvas マスキング
┌─────────────────────┐
│  脱敏画像（Blob）     │
└─────────────────────┘
          ↓ SHA-256
┌─────────────────────┐
│  evidenceHash        │
│  0xabcd1234...       │
└─────────────────────┘
          ↓ アップロード
┌─────────────────────┐
│  バックエンド API     │
│  - OCR 処理          │
│  - 削減量計算        │
└─────────────────────┘
          ↓ EIP-712 署名
┌─────────────────────┐
│  { claim, signature }│
└─────────────────────┘
          ↓ ユーザー確認
┌─────────────────────┐
│  submitClaim()       │
│  トランザクション送信 │
└─────────────────────┘
          ↓ 署名検証
┌─────────────────────┐
│  スマートコントラクト │
│  - 署名検証 ✓        │
│  - nonce チェック ✓  │
│  - 貢献記録 ✓        │
└─────────────────────┘
```

---

## ⚡ パフォーマンス最適化

### ガス料金の最適化

1. **オフチェーン計算**
   - 削減量計算をバックエンドで実行
   - チェーン上では署名検証のみ

2. **Batch 処理（将来的な拡張）**
   - 複数の claim を一度に処理
   - Merkle Tree を使用して検証

3. **Layer 2 の使用**
   - Polygon（すでに使用中）
   - ガス料金が Ethereum の 1/100 以下

---

## 🔮 今後の拡張案

### Phase 2: 自動化と標準化

- **規則エンジン**：より洗練された削減量計算
- **監査ログ**：すべての証拠処理履歴を記録
- **EAS 統合**：Ethereum Attestation Service との連携

### Phase 3: プライバシー強化

- **ゼロ知識証明**：証拠の詳細を公開せずに検証
- **直接署名**：電力会社が直接デジタル明細に署名
- **選択的開示**：必要な情報のみを開示

---

## 📚 参考リンク

- [EIP-712 仕様](https://eips.ethereum.org/EIPS/eip-712)
- [ethers.js ドキュメント](https://docs.ethers.org/)
- [Polygon Amoy Testnet](https://polygon.technology/blog/introducing-the-amoy-testnet-for-polygon-pos)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

## 📝 ライセンス

MIT License

---

**作成日：** 2025年12月9日
**バージョン：** 1.0
**対象システム：** EcoDAO - CO₂削減 DAO プラットフォーム
