"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWeb3, useContractWrite } from "@/hooks";
import {
  uploadToPinata,
  isPinataConfigured,
  createPreviewUrl,
  revokePreviewUrl,
} from "@/lib/ipfs";

interface FormData {
  title: string;
  description: string;
  targetAmountKg: string;
  uncompletedImageURI: string;
  completedImageURI: string;
}

interface ImageUpload {
  file: File | null;
  preview: string;
  uri: string;
  isUploading: boolean;
}

export default function CreateDAOPage() {
  const { isConnected, connect } = useWeb3();
  const { createSubDAO, isPending, isSuccess, error, reset } =
    useContractWrite();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    targetAmountKg: "",
    uncompletedImageURI: "",
    completedImageURI: "",
  });

  const [uncompletedImage, setUncompletedImage] = useState<ImageUpload>({
    file: null,
    preview: "",
    uri: "",
    isUploading: false,
  });

  const [completedImage, setCompletedImage] = useState<ImageUpload>({
    file: null,
    preview: "",
    uri: "",
    isUploading: false,
  });

  const [useDirectUri, setUseDirectUri] = useState(!isPinataConfigured());
  const [formError, setFormError] = useState<string | null>(null);

  const uncompletedInputRef = useRef<HTMLInputElement>(null);
  const completedInputRef = useRef<HTMLInputElement>(null);

  // 入力ハンドラ
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 画像選択ハンドラ
  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "uncompleted" | "completed"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setter =
      type === "uncompleted" ? setUncompletedImage : setCompletedImage;
    const preview = createPreviewUrl(file);

    setter((prev) => {
      if (prev.preview) revokePreviewUrl(prev.preview);
      return { ...prev, file, preview, uri: "" };
    });

    // Pinata が設定されていればアップロード
    if (isPinataConfigured()) {
      setter((prev) => ({ ...prev, isUploading: true }));
      try {
        const uri = await uploadToPinata(file);
        setter((prev) => ({ ...prev, uri, isUploading: false }));
      } catch (err) {
        console.error("アップロードエラー:", err);
        setter((prev) => ({ ...prev, isUploading: false }));
        setFormError(
          "画像のアップロードに失敗しました。URI を直接入力してください。"
        );
        setUseDirectUri(true);
      }
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // バリデーション
    if (!formData.title.trim()) {
      setFormError("タイトルを入力してください");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("説明を入力してください");
      return;
    }
    const targetKg = parseFloat(formData.targetAmountKg);
    if (isNaN(targetKg) || targetKg <= 0) {
      setFormError("有効な目標削減量を入力してください");
      return;
    }

    // 画像 URI の決定
    const uncompletedURI = useDirectUri
      ? formData.uncompletedImageURI
      : uncompletedImage.uri;
    const completedURI = useDirectUri
      ? formData.completedImageURI
      : completedImage.uri;

    if (!uncompletedURI || !completedURI) {
      setFormError("両方の画像を設定してください");
      return;
    }

    try {
      await createSubDAO(
        formData.title,
        formData.description,
        targetKg,
        uncompletedURI,
        completedURI
      );
    } catch {
      // エラーは hook 内で処理済み
    }
  };

  // 成功時の表示
  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl bg-green-50 p-8 text-center">
          <span className="text-6xl">🎉</span>
          <h2 className="mt-4 text-2xl font-bold text-green-800">
            DAO が作成されました！
          </h2>
          <p className="mt-2 text-green-600">
            トランザクションが承認され、新しい DAO が発行されました。
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/"
              className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
            >
              ダッシュボードへ
            </Link>
            <button
              onClick={() => {
                reset();
                setFormData({
                  title: "",
                  description: "",
                  targetAmountKg: "",
                  uncompletedImageURI: "",
                  completedImageURI: "",
                });
              }}
              className="rounded-lg border border-green-600 px-6 py-2 font-medium text-green-600 hover:bg-green-50"
            >
              続けて作成
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          ← ダッシュボードに戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          🌱 新しい DAO を作成
        </h1>
        <p className="mt-2 text-gray-600">
          CO₂ 削減テーマを設定して、仲間を集めましょう
        </p>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-yellow-800">
            DAO を作成するにはウォレット接続が必要です
          </p>
          <button
            onClick={connect}
            className="mt-2 rounded bg-yellow-600 px-4 py-1 text-sm text-white hover:bg-yellow-700"
          >
            ウォレットを接続
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            DAO タイトル *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="例: 省エネ家電で CO₂ 削減チャレンジ"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            説明・ストーリー *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="どのような活動で CO₂ を削減するのか、ストーリーを記載してください"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>

        {/* Target Amount */}
        <div>
          <label
            htmlFor="targetAmountKg"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            目標削減量 (kg) *
          </label>
          <div className="relative">
            <input
              type="number"
              id="targetAmountKg"
              name="targetAmountKg"
              value={formData.targetAmountKg}
              onChange={handleInputChange}
              placeholder="例: 1000"
              step="0.1"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              kg
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            1 トン = 1,000 kg で入力してください
          </p>
        </div>

        {/* Image Upload Mode Toggle */}
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-4 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              画像設定方法:
            </span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!useDirectUri && isPinataConfigured()}
                onChange={() => setUseDirectUri(false)}
                disabled={!isPinataConfigured()}
                className="text-green-600"
              />
              <span
                className={
                  isPinataConfigured() ? "text-gray-700" : "text-gray-400"
                }
              >
                ファイルをアップロード
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={useDirectUri}
                onChange={() => setUseDirectUri(true)}
                className="text-green-600"
              />
              <span className="text-gray-700">URI を直接入力</span>
            </label>
          </div>

          {!isPinataConfigured() && !useDirectUri && (
            <p className="mb-4 text-sm text-yellow-700">
              ⚠️ Pinata API キーが設定されていないため、URI
              直接入力モードになります
            </p>
          )}

          {/* Image Upload Section */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Uncompleted Image */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                未達成時の画像 *
              </label>
              {useDirectUri ? (
                <input
                  type="text"
                  name="uncompletedImageURI"
                  value={formData.uncompletedImageURI}
                  onChange={handleInputChange}
                  placeholder="ipfs://... または https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => uncompletedInputRef.current?.click()}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-green-400"
                >
                  {uncompletedImage.preview ? (
                    <div className="relative aspect-video">
                      <Image
                        src={uncompletedImage.preview}
                        alt="Preview"
                        fill
                        className="rounded object-cover"
                      />
                      {uncompletedImage.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-sm text-white">
                            アップロード中...
                          </span>
                        </div>
                      )}
                      {uncompletedImage.uri && (
                        <div className="absolute bottom-2 right-2 rounded bg-green-500 px-2 py-0.5 text-xs text-white">
                          ✓ アップロード完了
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl">🌱</span>
                      <p className="mt-2 text-sm text-gray-500">
                        クリックして画像を選択
                      </p>
                    </>
                  )}
                  <input
                    ref={uncompletedInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, "uncompleted")}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Completed Image */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                達成時の画像 *
              </label>
              {useDirectUri ? (
                <input
                  type="text"
                  name="completedImageURI"
                  value={formData.completedImageURI}
                  onChange={handleInputChange}
                  placeholder="ipfs://... または https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => completedInputRef.current?.click()}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-green-400"
                >
                  {completedImage.preview ? (
                    <div className="relative aspect-video">
                      <Image
                        src={completedImage.preview}
                        alt="Preview"
                        fill
                        className="rounded object-cover"
                      />
                      {completedImage.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-sm text-white">
                            アップロード中...
                          </span>
                        </div>
                      )}
                      {completedImage.uri && (
                        <div className="absolute bottom-2 right-2 rounded bg-green-500 px-2 py-0.5 text-xs text-white">
                          ✓ アップロード完了
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl">🌳</span>
                      <p className="mt-2 text-sm text-gray-500">
                        クリックして画像を選択
                      </p>
                    </>
                  )}
                  <input
                    ref={completedInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, "completed")}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {(formError || error) && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {formError || error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || !isConnected}
          className="w-full rounded-lg bg-green-600 py-4 text-lg font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              トランザクション処理中...
            </span>
          ) : (
            "🌿 DAO を作成する"
          )}
        </button>
      </form>
    </div>
  );
}
