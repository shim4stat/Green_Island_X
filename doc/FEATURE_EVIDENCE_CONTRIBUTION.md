# 証拠ベースの CO₂ 削減量記録機能

## 📝 概要

このプルリクエストは、ユーザーが証拠画像（電気料金明細、歩数記録、太陽光発電記録など）をアップロードし、サーバー側で検証・署名を行い、ブロックチェーンに削減量を記録する機能を実装します。

## 🎯 実装内容

### 1. フロントエンド

#### 新規コンポーネント
- **`frontend/src/components/EvidenceContribution.tsx`**
  - 証拠画像のアップロードと Canvas ベースのマスキング機能
  - 個人情報保護のための画像編集（マウスで矩形を描いてマスキング）
  - 証拠タイプの選択（電気料金、移動手段、太陽光発電、その他）
  - API への送信とブロックチェーンへの記録

#### 既存ファイルの変更
- **`frontend/src/app/dao/[id]/page.tsx`**
  - `EvidenceContribution` コンポーネントの統合
  - DAO 詳細ページに証拠アップロード機能を追加

- **`frontend/src/components/index.ts`**
  - `EvidenceContribution` のエクスポート追加

- **`frontend/src/hooks/useContract.ts`**
  - `submitClaim()` 関数の追加（EIP-712 署名付き Claim のオンチェーン送信）

- **`frontend/src/lib/abi.ts`**
  - `submitClaim` 関数の ABI 定義追加

- **`frontend/src/lib/ethereum.ts`**
  - ヘルパー関数の追加（必要に応じて）

- **`frontend/src/types/index.ts`**
  - `EvidenceVerificationResult` 型の追加
  - `ReductionClaim` 型の追加

- **`frontend/.env.example`**
  - 環境変数の例を追加（OCR API、排出係数など）

### 2. バックエンド API

#### 新規 API エンドポイント
- **`frontend/src/app/api/evidence/route.ts`**
  - `POST /api/evidence`: 証拠画像の受信と処理
  - OCR による画像からのデータ抽出（ocr.space API 使用）
  - 証拠タイプ別の削減量計算ロジック
    - **電気料金明細**: kWh または円から削減量を推定
    - **歩数記録**: 歩数から距離と削減量を計算
    - **太陽光発電**: 発電量 (kWh) から削減量を計算
  - EIP-712 署名の生成（Attester の秘密鍵を使用）
  - Claim 構造体と署名をフロントエンドに返却

### 3. スマートコントラクト

#### 既存コントラクトの変更
- **`contract/src/EcoDAO.sol`**
  - EIP-712 標準のサポート追加（OpenZeppelin の `EIP712` 継承）
  - `Claim` 構造体の定義
  - `submitClaim()` 関数の実装
    - EIP-712 署名の検証
    - Verifier（バックエンド署名者）のアドレス確認
    - Nonce によるリプレイ攻撃防止
    - 有効期限のチェック
    - 検証成功後、内部で `_contribute()` を呼び出し
  - `setVerifier()` 管理者関数の追加
  - `verifier` アドレスと `usedNonce` マッピングの追加
  - `CLAIM_TYPEHASH` 定数の定義

### 4. ドキュメント

- **`doc/attestation_flow.md`**
  - 証拠アップロードから署名、オンチェーン記録までの完全なフロー図
  - 技術アーキテクチャの詳細説明
  - セキュリティ機構の解説
  - 3つのユースケースの実装例
  - 環境変数設定ガイド

### 5. テスト用素材

- **`test-materials/`**
  - `Sample1.png`, `sample2.jpg`, `sample3.jpg`
  - 証拠アップロード機能のテスト用画像サンプル

## 🔐 セキュリティ機構

1. **EIP-712 署名**: タイプ付きデータの署名により、フィッシング攻撃を防止
2. **Nonce によるリプレイ攻撃防止**: 各 Claim は一度のみ使用可能
3. **有効期限**: Claim は 30 日間のみ有効
4. **Verifier 検証**: バックエンドで署名された Claim のみがオンチェーンで受理
5. **画像ハッシュ**: 証拠画像の SHA-256 ハッシュを Claim に含めることで改ざんを検出
6. **ローカルマスキング**: 個人情報は送信前にブラウザ内で削除

## 🧪 テスト方法

### 必要な環境変数

```env
# Attester の秘密鍵（バックエンド署名用）
ATTESTER_PRIVATE_KEY=your_private_key_here

# OCR API（オプション）
OCR_API_ENDPOINT=https://api.ocr.space/parse/image
OCR_API_KEY=your_ocr_api_key

# 排出係数（オプション、デフォルト値あり）
EMISSION_FACTOR_KG_PER_KWH=0.5
UNIT_PRICE_YEN_PER_KWH=30
STEP_LENGTH_M=0.7
CAR_EMISSION_KG_PER_KM=0.2

# コントラクトアドレス
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### テスト手順

1. ウォレットを接続
2. DAO 詳細ページに移動
3. 「証拠付きで削減量を記録する」セクションまでスクロール
4. `test-materials/` から画像を選択
5. 必要に応じて個人情報をマスキング
6. 証拠タイプと期間を入力
7. 「証拠をアップロードして削減量を計算する」をクリック
8. 計算結果を確認
9. 「この結果をブロックチェーンに記録する」をクリック
10. MetaMask でトランザクションを承認

## 📊 技術スタック

- **フロントエンド**: React, Next.js, TypeScript, Canvas API
- **バックエンド**: Next.js API Routes, Node.js
- **スマートコントラクト**: Solidity 0.8.27, OpenZeppelin
- **署名**: EIP-712 Typed Data Signing, ethers.js
- **OCR**: ocr.space API（オプション）

## 🔄 今後の拡張予定

- [ ] より高度な OCR エンジンの統合（Google Vision API など）
- [ ] AI による証拠画像の自動検証
- [ ] 複数の証拠画像の同時アップロード
- [ ] 証拠画像の IPFS 保存（現在はハッシュのみ記録）
- [ ] DAO 管理者による証拠の再検証機能

---

詳細な技術仕様とフロー図については、[`doc/attestation_flow.md`](./attestation_flow.md) をご参照ください。
