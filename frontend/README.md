# EcoDAO Frontend

CO₂ 削減活動をブロックチェーン上で可視化・資産化する階層型 DAO プラットフォームのフロントエンドアプリケーションです。

## 🌿 概要

- **技術スタック**: Next.js 15, TypeScript, Tailwind CSS, ethers.js v6
- **対応ウォレット**: MetaMask
- **対応ネットワーク**: Localhost (Anvil), Sepolia Testnet

## 🚀 セットアップ手順

### 前提条件

- Node.js 18 以上
- npm または yarn
- MetaMask ブラウザ拡張機能
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (ローカル開発時)

### 1. 依存パッケージのインストール

```bash
cd frontend
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定:

```bash
# コントラクトアドレス（デプロイ後に設定）
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# チェーンID (31337 = localhost, 11155111 = Sepolia)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337
```

### 3. ローカルブロックチェーンの起動（開発時）

ターミナルを開いて Anvil を起動:

```bash
anvil
```

### 4. コントラクトのデプロイ（初回のみ）

別のターミナルで:

```bash
cd frontend/contract-example

# 依存関係インストール
forge install

# コントラクトをデプロイ
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

デプロイ後に表示されるコントラクトアドレスを `.env.local` に設定してください。

### 5. MetaMask の設定

1. MetaMask を開く
2. ネットワークを追加:
   | 項目 | 値 |
   |------|-----|
   | ネットワーク名 | Localhost 8545 |
   | RPC URL | `http://127.0.0.1:8545` |
   | チェーン ID | `31337` |
   | 通貨シンボル | ETH |

3. Anvil のテストアカウントをインポート（開発用）:
   - Anvil 起動時に表示される秘密鍵をコピー
   - MetaMask → アカウントをインポート → 秘密鍵を貼り付け

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 📁 プロジェクト構成

```
frontend/
├── src/
│   ├── app/              # Next.js App Router ページ
│   │   ├── page.tsx      # ホーム（DAO一覧）
│   │   ├── create/       # DAO作成ページ
│   │   └── dao/[id]/     # DAO詳細ページ
│   ├── components/       # 再利用可能なコンポーネント
│   ├── hooks/            # カスタムフック（useWeb3, useDAO等）
│   ├── lib/              # ユーティリティ（ethereum, abi, ipfs）
│   └── types/            # TypeScript型定義
├── contract-example/     # サンプルスマートコントラクト（Foundry）
│   ├── src/EcoDAO.sol    # メインコントラクト
│   ├── test/             # テスト
│   └── script/           # デプロイスクリプト
└── public/               # 静的ファイル
```

## 🔧 利用可能なコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番モードで起動
npm start

# リント
npm run lint
```

## 🧪 コントラクトのテスト

```bash
cd contract-example
forge test -vvv
```

## 📝 主な機能

- **DAO 一覧表示**: 作成されたすべての DAO を表示
- **DAO 作成**: 新しい CO₂ 削減目標の DAO を作成（NFT 発行）
- **貢献記録**: DAO への CO₂ 削減量を記録
- **進捗表示**: 目標達成率をプログレスバーで可視化
- **NFT 進化**: 目標達成で NFT 画像が変化

## ⚠️ トラブルシューティング

### MetaMask で「ネットワークが見つかりません」

→ 上記の「MetaMask の設定」手順でローカルネットワークを追加してください。

### トランザクションが失敗する

→ Anvil を再起動した場合、MetaMask のアカウントの「アクティビティ」→「アカウントをリセット」で nonce をリセットしてください。

### 画像が表示されない

→ 外部画像 URL を使用している場合、`next.config.ts` にホストを追加する必要があります。

## 📄 ライセンス

MIT
