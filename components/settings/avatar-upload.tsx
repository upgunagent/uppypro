"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Upload, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AvatarUploadProps {
    userId: string;
    url?: string | null;
    fullName?: string;
}

export function AvatarUpload({ userId, url, fullName }: AvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(url || null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('user_id', userId);

            if (updateError) {
                throw updateError;
            }

            setAvatarUrl(publicUrl);
            toast({
                title: "Başarılı",
                description: "Profil fotoğrafı güncellendi.",
            });

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Fotoğraf yüklenirken bir hata oluştu: " + error.message,
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-6">
            <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg bg-slate-100">
                    {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                    <AvatarFallback className="bg-transparent text-slate-400 flex items-center justify-center w-full h-full">
                        <User className="w-12 h-12" />
                    </AvatarFallback>
                </Avatar>

                <button
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
            </div>

            <div className="space-y-1">
                <h4 className="font-medium text-slate-900">Profil Fotoğrafı</h4>
                <p className="text-sm text-slate-500">
                    JPG, GIF veya PNG. Maksimum 5MB.
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf Yükle
                    </Button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
            />
        </div>
    );
}
