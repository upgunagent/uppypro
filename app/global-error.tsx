"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <html lang="tr">
            <body
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    fontFamily: "Inter, system-ui, sans-serif",
                    background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
                    margin: 0,
                    padding: "24px",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        maxWidth: 380,
                        padding: "40px 28px",
                        background: "white",
                        borderRadius: 24,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#1e293b",
                            marginBottom: 8,
                        }}
                    >
                        Bağlantı Koptu
                    </h2>
                    <p
                        style={{
                            fontSize: 14,
                            color: "#64748b",
                            marginBottom: 24,
                            lineHeight: 1.6,
                        }}
                    >
                        Uygulama arka planda kaldığı için bağlantı kesildi.
                        Tekrar yüklemek için butona basın.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            width: "100%",
                            padding: "14px 24px",
                            background: "linear-gradient(135deg, #f97316, #ea580c)",
                            color: "white",
                            border: "none",
                            borderRadius: 14,
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
                        }}
                    >
                        🔄 Sayfayı Yenile
                    </button>
                </div>
            </body>
        </html>
    );
}
