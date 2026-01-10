"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Settings } from "lucide-react";
import Link from "next/link";
import { deleteTenant } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface TenantActionsProps {
    tenantId: string;
    tenantName: string;
}

export function TenantActions({ tenantId, tenantName }: TenantActionsProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`"${tenantName}" işletmesini ve tüm verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await deleteTenant(tenantId);
            if (result.success) {
                toast({
                    title: "Başarılı",
                    description: "İşletme ve ilgili veriler silindi.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: result.error || "Silme işlemi başarısız.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Menü</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                <Link href={`/admin/tenants/${tenantId}`}>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Yönet
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sil
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
