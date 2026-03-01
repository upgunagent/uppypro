import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "UppyPro",
  description: "Yapay Zeka Destekli WhatsApp & Instagram Mesaj Yönetimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";

  return (
    <html lang="tr" className="dark">
      <head>
        {/* Facebook SDK — raw script tags to guarantee execution order */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '${fbAppId}',
                  cookie: true,
                  xfbml: true,
                  version: 'v21.0'
                });
                window.__fbSDKReady = true;
                console.log('[FB SDK] ✅ Initialized successfully');
              };
            `,
          }}
        />
        <script
          async
          defer
          crossOrigin="anonymous"
          src="https://connect.facebook.net/en_US/sdk.js"
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
