import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EcoDAO - CO₂削減を可視化するDAOプラットフォーム",
  description:
    "個人のCO₂削減活動をブロックチェーン上で可視化・資産化する階層型DAOシステム",
  keywords: [
    "DAO",
    "CO2",
    "環境",
    "ブロックチェーン",
    "NFT",
    "サステナビリティ",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
          <p>© 2025 EcoDAO. Built for a sustainable future 🌍</p>
        </footer>
      </body>
    </html>
  );
}
