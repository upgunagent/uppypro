import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.upgunai.com"),
  title: {
    default: "UppyPro — WhatsApp & Instagram Yapay Zeka Yönetim Paneli | UPGUN AI",
    template: "%s | UppyPro — UPGUN AI",
  },
  description: "WhatsApp ve Instagram mesajlarınızı yapay zeka destekli tek panelden yönetin. 7/24 AI asistan, otomatik randevu, akıllı CRM, çok dilli çeviri. 7 gün ücretsiz deneyin.",
  keywords: [
    "whatsapp yönetim paneli", "whatsapp crm", "instagram dm yönetimi",
    "whatsapp yapay zeka asistanı", "whatsapp business yönetim",
    "whatsapp otomatik yanıt", "müşteri mesaj yönetimi", "whatsapp instagram tek panel",
    "yapay zeka müşteri hizmetleri", "whatsapp randevu sistemi",
    "uppypro", "upgun ai", "whatsapp chatbot türkiye"
  ],
  authors: [{ name: "UPGUN AI", url: "https://www.upgunai.com" }],
  creator: "UPGUN AI",
  publisher: "UPGUN AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://www.upgunai.com",
    siteName: "UppyPro — UPGUN AI",
    title: "UppyPro — WhatsApp & Instagram Yapay Zeka Yönetim Paneli",
    description: "WhatsApp ve Instagram mesajlarınızı yapay zeka destekli tek panelden yönetin. 7/24 AI asistan, otomatik randevu, akıllı CRM. 7 gün ücretsiz.",
    images: [
      {
        url: "/og-image1.png",
        width: 1200,
        height: 630,
        alt: "UppyPro — WhatsApp & Instagram AI Yönetim Paneli",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UppyPro — WhatsApp & Instagram Yapay Zeka Yönetim Paneli",
    description: "WhatsApp ve Instagram mesajlarınızı yapay zeka ile yönetin. 7 gün ücretsiz.",
    images: ["/og-image1.png"],
  },
  alternates: {
    canonical: "https://www.upgunai.com",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use NEXT_PUBLIC_FACEBOOK_APP_ID, but gracefully fall back to IG_APP_ID if it's missing in Vercel.
  // This works because layout.tsx is a Server Component.
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.IG_APP_ID || "";

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
