# EcoDAO Frontend

CO₂ 削減活動をブロックチェーン上で可視化・資産化する階層型 DAO プラットフォームのフロントエンドアプリケーションです。

## 🌿 概要

- **技術スタック**: Next.js 15, TypeScript, Tailwind CSS, ethers.js v6
- **対応ウォレット**: MetaMask
- **対応ネットワーク**: Localhost (Anvil), Sepolia Testnet, Polygon Amoy Testnet

## ⚡ クイックスタート（Polygon Amoy）

最短で Amoy テストネットでアプリを動かす手順：

```bash
# 1. 依存パッケージをインストール
cd frontend
npm install

# 2. コントラクトをデプロイ
cd contract-example
forge install
forge script script/Deploy.s.sol \
  --rpc-url https://rpc-amoy.polygon.technology \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast

# 3. 環境変数を設定（.env.local）
# NEXT_PUBLIC_CONTRACT_ADDRESS=<デプロイされたアドレス>
# NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002

# 4. アプリを起動
cd ..
npm run dev
```

> 💡 テスト用 POL は [Polygon Faucet](https://faucet.polygon.technology/) で取得できます

---

## 🚀 セットアップ手順（詳細）

### 前提条件

- Node.js 18 以上
- npm または yarn
- MetaMask ブラウザ拡張機能
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### 1. 依存パッケージのインストール

```bash
cd frontend
npm install
```

### 2. コントラクト依存関係のインストール

```bash
cd contract-example
forge install
```

---

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

## 🔷 Polygon Amoy テストネットへのデプロイ

Polygon Amoy は Polygon PoS のテストネットです。本番環境に近い形でテストできます。

### Step 1: テスト用 MATIC の取得

[Polygon Faucet](https://faucet.polygon.technology/) にアクセスし、ウォレットアドレスを入力して Amoy 用の MATIC を取得してください（無料）。

### Step 2: コントラクトのデプロイ

```bash
cd frontend/contract-example

# 依存関係をインストール（初回のみ）
forge install

# Amoy にデプロイ
forge script script/Deploy.s.sol \
  --rpc-url https://rpc-amoy.polygon.technology \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast
```

デプロイ成功後、以下のような出力が表示されます：

```
== Return ==
0: contract EcoDAO 0x1234...abcd   ← このアドレスをコピー
```

### Step 3: フロントエンドの環境変数を設定

`frontend/.env.local` を作成または編集:

```bash
# デプロイされたコントラクトアドレス
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234...abcd

# Polygon Amoy のチェーンID
NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002
```

### Step 4: MetaMask に Polygon Amoy を追加

MetaMask を開き、以下の設定でネットワークを追加:

| 項目                     | 値                                    |
| ------------------------ | ------------------------------------- |
| ネットワーク名           | Polygon Amoy Testnet                  |
| RPC URL                  | `https://rpc-amoy.polygon.technology` |
| チェーン ID              | `80002`                               |
| 通貨シンボル             | MATIC                                 |
| ブロックエクスプローラー | `https://amoy.polygonscan.com`        |

### Step 5: アプリを起動

```bash
cd frontend
npm run dev
```

ブラウザで http://localhost:3000 を開き、MetaMask で Polygon Amoy に接続してください。

### （オプション）コントラクトの検証

PolygonScan でコントラクトを検証すると、ソースコードが公開されます：

```bash
forge verify-contract <CONTRACT_ADDRESS> src/EcoDAO.sol:EcoDAO \
  --chain-id 80002 \
  --verifier-url https://api-amoy.polygonscan.com/api \
  --etherscan-api-key <POLYGONSCAN_API_KEY>
```

> PolygonScan API Key は https://polygonscan.com/myapikey で取得できます

---

## 🏠 ローカル開発（Anvil）

---

## 🏠 ローカル開発（Anvil）

ローカル環境でテストする場合は Anvil を使用します。

### 1. Anvil を起動

```bash
anvil
```

### 2. コントラクトをデプロイ

```bash
cd frontend/contract-example
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 3. 環境変数を設定

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=<デプロイされたアドレス>
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337
```

### 4. MetaMask の設定

| 項目           | 値                      |
| -------------- | ----------------------- |
| ネットワーク名 | Localhost 8545          |
| RPC URL        | `http://127.0.0.1:8545` |
| チェーン ID    | `31337`                 |
| 通貨シンボル   | ETH                     |

Anvil 起動時に表示される秘密鍵を MetaMask にインポートしてください。

---

## 📝 主な機能

- **DAO 一覧表示**: 作成されたすべての DAO を表示
- **DAO 作成**: 新しい CO₂ 削減目標の DAO を作成（NFT 発行）
- **貢献記録**: DAO への CO₂ 削減量を記録
- **進捗表示**: 目標達成率をプログレスバーで可視化
- **NFT 進化**: 目標達成で NFT 画像が変化

---

## ☁️ AWS App Runner へのデプロイ

Docker を使って AWS App Runner にデプロイする手順です。

### 前提条件

- AWS CLI がインストール済み・設定済み
- Docker がインストール済み

### Step 1: ECR リポジトリを作成

```bash
# リージョンを設定（東日本: ap-northeast-1）
export AWS_REGION=ap-northeast-1

# ECR リポジトリを作成
aws ecr create-repository --repository-name ecodao-frontend --region $AWS_REGION
```

### Step 2: Docker イメージをビルド

```bash
cd frontend

# コントラクトアドレスを設定（Amoyにデプロイ済みのもの）
export CONTRACT_ADDRESS=0x1234...your_contract_address

# Docker イメージをビルド
docker build \
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS \
  --build-arg NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002 \
  -t ecodao-frontend .
```

### Step 3: ECR にプッシュ

```bash
# AWS アカウント ID を取得
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ECR にログイン
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# タグ付け
docker tag ecodao-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecodao-frontend:latest

# プッシュ
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecodao-frontend:latest
```

### Step 4: App Runner サービスを作成

以下の設定ファイル `apprunner.json` を作成します（ポート 3000、TCP ヘルスチェックを設定）：

```json
{
  "ServiceName": "ecodao-frontend-v3",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/ecodao-frontend:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "HOSTNAME": "0.0.0.0",
          "PORT": "3000"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:role/service-role/AppRunnerECRAccessRole"
    }
  },
  "HealthCheckConfiguration": {
    "Protocol": "TCP",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  },
  "InstanceConfiguration": {
    "Cpu": "1024",
    "Memory": "2048"
  }
}
```

> ※ `<YOUR_AWS_ACCOUNT_ID>` はご自身の AWS アカウント ID（例: 007924758667）に置き換えてください。
> ※ 事前に `AppRunnerECRAccessRole` IAM ロールを作成する必要があります。

CLI でサービスを作成：

```bash
aws apprunner create-service --cli-input-json file://apprunner.json --region ap-northeast-1
```

### Step 5: デプロイ確認

App Runner コンソールでサービスのステータスが「Running」になったら、
表示される URL（`https://xxxxx.ap-northeast-1.awsapprunner.com`）にアクセス！

### 更新時のデプロイ

```bash
# 再ビルド & プッシュ
docker build \
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS \
  --build-arg NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002 \
  -t ecodao-frontend .

docker tag ecodao-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecodao-frontend:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecodao-frontend:latest

# 自動デプロイが有効なら、プッシュ後に自動で更新される
```

---

## ⚠️ トラブルシューティング

### MetaMask で「ネットワークが見つかりません」

→ 上記の「MetaMask の設定」手順でローカルネットワークを追加してください。

### トランザクションが失敗する

→ Anvil を再起動した場合、MetaMask のアカウントの「アクティビティ」→「アカウントをリセット」で nonce をリセットしてください。

### 画像が表示されない

→ 外部画像 URL を使用している場合、`next.config.ts` にホストを追加する必要があります。

## 📄 ライセンス

MIT
