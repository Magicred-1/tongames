import type { Metadata } from "next";
import { Inter, Space_Grotesk, Roboto_Mono } from "next/font/google";
import "./globals.css";
import DynamicTonWrapper                    from "@/components/DynamicTonWrapper/Wrapper";
import { GameSocketProvider }               from "@/lib/gameSocket";
import { TonTransactionHandlerLoader }      from "@/components/TonTransactionHandlerLoader";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-headline",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-robotomono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TON Games - Luminescent Frontier",
  description: "A high-stakes decentralized arena where strategy meets the speed of light.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface overflow-x-hidden">
        <GameSocketProvider>
          <DynamicTonWrapper>
            <TonTransactionHandlerLoader />
            {children}
          </DynamicTonWrapper>
        </GameSocketProvider>
      </body>
    </html>
  );
}
