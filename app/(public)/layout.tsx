import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container px-4 md:px-6 flex h-14 max-w-screen-2xl items-center mx-auto justify-between">
                    <div className="flex items-center gap-2">
                        <Link className="flex items-center space-x-2 font-bold text-xl text-foreground" href="/">
                            <span className="text-primary">Uppy</span>Pro
                        </Link>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">İşletme Giriş</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>İşletme Üyeliği Yap</Button>
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4 md:px-6">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        &copy; 2026 UppyPro. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
