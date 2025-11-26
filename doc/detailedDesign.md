# 詳細設計書：階層型 CO₂ 削減 DAO システム (MVP)

※この文書は AI にコーディングさせるために作成しています。詳細設計書としてチーム内の合意を得ているものではありません。

## 1\. ディレクトリ構成 (Directory Structure)

モノレポ構成を想定し、フロントエンドとスマートコントラクトを管理します。

```text
root/
├── contracts/                  # Smart Contract (Foundry)
│   ├── src/
│   │   ├── EcoDAO.sol          # Main Contract
│   │   └── IEcoDAO.sol         # Interface
│   ├── script/
│   │   └── Deploy.s.sol        # Deployment Script
│   └── test/
│       └── EcoDAO.t.sol        # Unit Tests
└── frontend/                   # DApp (Next.js)
    ├── src/
    │   ├── app/                # App Router Pages
    │   ├── components/         # UI Components
    │   ├── hooks/              # Custom React Hooks (useWeb3, etc.)
    │   ├── lib/                # Utils (IPFS, ethers setup)
    │   └── types/              # TypeScript Interfaces
    └── public/
```

---

## 2\. スマートコントラクト詳細仕様 (EcoDAO.sol)

### 2.1 継承とライブラリ

- **Inheritance:** `ERC721` (OpenZeppelin), `Ownable` (OpenZeppelin)
- **Library:** `Strings` (for uint to string conversion)

### 2.2 状態変数 (State Variables)の詳細

基本設計書の `SubDAO` 構造体に加え、効率的なクエリのためのカウンターを追加します。

```solidity
uint256 private _nextTokenId; // Default: 1 (0 is reserved or not used)
```

### 2.3 イベント定義 (Events)

フロントエンドが状態変化を検知するために必須です。

```solidity
event DAOCreated(uint256 indexed tokenId, address indexed admin, string title, uint256 targetAmount);
event ContributionReceived(uint256 indexed tokenId, address indexed contributor, uint256 amount, uint256 totalAmount);
event DAOCompleted(uint256 indexed tokenId, uint256 finalAmount);
event DAOSplit(uint256 indexed oldTokenId, uint256 indexed newTokenId, address indexed newAdmin);
```

### 2.4 関数ロジック詳細

#### `createSubDAO`

- **Validation:** `targetAmount > 0`, `title` が空でないこと。
- **Logic:**
  1.  `_nextTokenId` を取得し、一時変数 `newItemId` に格納。
  2.  `_safeMint(msg.sender, newItemId)`。
  3.  Struct `SubDAO` を初期化して Mapping に保存。
  4.  `_nextTokenId++`。
  5.  `emit DAOCreated(...)`。

#### `contribute`

- **Validation:**
  - `_exists(tokenId)` であること。
  - `!daos[tokenId].isCompleted` であること（完了済みへの寄付は不可とするか、超過寄付とするか？ → **仕様:** 完了後も寄付可能だがステータスは変わらないものとする）。
- **Logic:**
  1.  `contributions[tokenId][msg.sender] += amount`。
  2.  `daos[tokenId].currentAmount += amount`。
  3.  **達成判定:**
      $$currentAmount \ge targetAmount$$
      かつ `isCompleted == false` の場合：
      - `isCompleted = true`
      - `emit DAOCompleted(...)`

#### `splitDAO`

- **Validation:**
  - `msg.sender == daos[originalTokenId].admin` (MVP では管理者のみ)。
  - `daos[originalTokenId].isCompleted == true` (達成済みであること)。
- **Logic:**
  1.  新しい ID `newItemId` を生成。
  2.  `_safeMint(msg.sender, newItemId)`。
  3.  元の `originalTokenId` の `SubDAO` データをコピーし、以下を上書きして保存：
      - `currentAmount = 0`
      - `isCompleted = false`
      - `parentId = originalTokenId`
  4.  `emit DAOSplit(originalTokenId, newItemId, msg.sender)`。

#### `tokenURI` (Dynamic Logic)

- **Logic:**
  1.  `daos[tokenId].isCompleted` をチェック。
  2.  True の場合:
      - Base64 エンコードされた JSON を返す。JSON 内の `image` は `completedImageURI`。
      - Attributes に `Status: "Completed"`, `Progress: "100%"` 等を含める。
  3.  False の場合:
      - JSON 内の `image` は `uncompletedImageURI`。
      - Attributes に `Status: "Active"`, `Progress: (current/target)%` を含める。

---

## 3\. フロントエンド詳細仕様 (Next.js)

[Image of user interface component hierarchy]

### 3.1 TypeScript インターフェース (`src/types/index.ts`)

```typescript
export interface SubDAO {
  tokenId: number;
  title: string;
  description: string;
  targetAmount: number; // Grams
  currentAmount: number; // Grams
  uncompletedImageURI: string;
  completedImageURI: string;
  isCompleted: boolean;
  parentId: number;
  admin: string;
}

export interface Contribution {
  contributor: string;
  amount: number;
}
```

### 3.2 ページ構成とロジック

#### A. トップページ (`app/page.tsx`)

- **役割:** 全 DAO の一覧表示。
- **Data Fetching:**
  - `_nextTokenId` の数だけループして `daos(i)` を Call するのは重いため、MVP では `Multicall` を使用するか、もしくは直近 20 件程度を取得する仕様とする。
  - **コンポーネント:** `<DAOList />` \> `<DAOCard />`

#### B. 詳細ページ (`app/dao/[id]/page.tsx`)

- **役割:** 特定の DAO の状態表示とアクション。
- **State:** `daoData`, `userContribution`, `isOwner`。
- **Interactive UI:**
  - `<ProgressBar current={dao.currentAmount} target={dao.targetAmount} />`
  - `<ContributionInput />`: ユーザー入力 (kg) を $g = kg \times 1000$ に変換して `contribute` 関数へ渡す。
  - `<ConfettiTrigger />`: `isCompleted` が `true` になった瞬間に発火。

#### C. 作成ページ (`app/create/page.tsx`)

- **役割:** 新規 DAO の発行。
- **Forms:**
  - Title, Description, Target Amount (kg)。
  - **Image Upload:** `<input type="file" multiple />` (Before/After 用)。
- **Process:**
  1.  ユーザーが画像をアップロード。
  2.  `lib/ipfs.ts` を使用して Pinata へ POST。`ipfs://Qm...` 形式の CID を 2 つ取得。
  3.  取得した CID とフォームデータを引数に `contract.createSubDAO(...)` を実行。

### 3.3 ユーティリティ・ライブラリ

#### `lib/ethereum.ts`

- `ethers.BrowserProvider` を使用したシングルトン、または Hook (`useEthereum`)。
- コントラクトのアドレスと ABI を定数定義。

#### `lib/ipfs.ts`

- Pinata API (SDK または fetch) をラップ。
- `uploadFile(file: File): Promise<string>`

---

## 4\. メタデータ仕様 (Off-Chain JSON Schema)

`tokenURI` が返す Base64 デコード後の JSON、または IPFS 上の JSON 構造（OpenSea 標準準拠）。

```json
{
  "name": "Project Name #1",
  "description": "Description text...",
  "image": "ipfs://QmUncompletedImageHash...",
  "attributes": [
    {
      "trait_type": "Target CO2 Reduction",
      "value": 1000,
      "display_type": "number",
      "unit": "g"
    },
    {
      "trait_type": "Current Reduction",
      "value": 350,
      "display_type": "number",
      "unit": "g"
    },
    { "trait_type": "Status", "value": "Active" },
    { "trait_type": "Parent DAO ID", "value": 0 }
  ]
}
```

※ `image` フィールドは、コントラクト内の `isCompleted` フラグによって動的に切り替わります。

---

## 5\. 開発・デプロイ手順 (DevOps)

### 環境変数 (.env)

```env
# Frontend
NEXT_PUBLIC_PINATA_API_KEY=...
NEXT_PUBLIC_PINATA_SECRET_KEY=...
NEXT_PUBLIC_CONTRACT_ADDRESS=...

# Contract
PRIVATE_KEY=...
SEPOLIA_RPC_URL=...
ETHERSCAN_API_KEY=...
```

### 実装ステップ

1.  **Contract:** Solidity コード作成 → Foundry でテスト (`test/EcoDAO.t.sol`) → Sepolia へデプロイ。
2.  **Config:** デプロイしたコントラクトアドレスと ABI をフロントエンドにコピー。
3.  **Frontend:** ページとコンポーネントの実装、IPFS 接続確認、Goerli/Sepolia での E2E 動作確認。
