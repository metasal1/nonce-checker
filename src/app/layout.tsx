import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana Nonce Checker — Detect Durable Nonce Risks",
  description: "Scan Solana multisig addresses for durable nonce accounts that could be exploited. Detect suspicious nonce assignments before they become attack vectors.",
  openGraph: {
    title: "Solana Nonce Checker",
    description: "Scan for durable nonce attack vectors on Solana multisigs",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-gray-100 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
