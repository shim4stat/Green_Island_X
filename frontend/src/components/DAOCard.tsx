"use client";

import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "./ProgressBar";
import { ipfsToHttpUrl } from "@/lib/ipfs";
import type { SubDAO } from "@/types";

interface DAOCardProps {
  dao: SubDAO;
}

export function DAOCard({ dao }: DAOCardProps) {
  const imageUrl = dao.isCompleted
    ? ipfsToHttpUrl(dao.completedImageURI)
    : ipfsToHttpUrl(dao.uncompletedImageURI);

  return (
    <Link href={`/dao/${dao.tokenId}`}>
      <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={dao.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl">🌱</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute right-2 top-2">
            {dao.isCompleted ? (
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                達成 ✓
              </span>
            ) : (
              <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                進行中
              </span>
            )}
          </div>

          {/* Parent Badge */}
          {dao.parentId > 0 && (
            <div className="absolute left-2 top-2">
              <span className="rounded-full bg-purple-500 px-2 py-1 text-xs font-medium text-white shadow-sm">
                🧬 #{dao.parentId} から分裂
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 truncate text-lg font-semibold text-gray-900 group-hover:text-green-600">
            {dao.title}
          </h3>
          <p className="mb-4 line-clamp-2 text-sm text-gray-700">
            {dao.description}
          </p>

          {/* Progress */}
          <ProgressBar
            current={dao.currentAmount}
            target={dao.targetAmount}
            size="sm"
          />
        </div>
      </div>
    </Link>
  );
}
