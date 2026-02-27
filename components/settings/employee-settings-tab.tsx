"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { addTenantEmployee, updateTenantEmployee, deleteTenantEmployee } from "@/app/actions/employees";

// Temporary mock type until full types are regenerated
interface Employee {
    id: string;
    tenant_id: string;
    name: string;
    title: string | null;
    created_at: string;
}

interface EmployeeSettingsTabProps {
    tenantId: string;
    initialEmployees: Employee[];
}

export function EmployeeSettingsTab({ tenantId, initialEmployees }: EmployeeSettingsTabProps) {
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");

    const openCreateDialog = () => {
        setSelectedEmployee(null);
        setName("");
        setTitle("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setName(employee.name);
        setTitle(employee.title || "");
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ variant: "destructive", title: "Hata", description: "Personel adı zorunludur." });
            return;
        }

        setLoading(true);

        if (selectedEmployee) {
            // Update
            const result = await updateTenantEmployee(selectedEmployee.id, name, title);
            if (result.success && result.employee) {
                setEmployees(employees.map(e => e.id === selectedEmployee.id ? result.employee as Employee : e));
                toast({ title: "Başarılı", description: "Personel bilgileri güncellendi." });
                setIsDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Güncelleme başarısız." });
            }
        } else {
            // Create
            const result = await addTenantEmployee(tenantId, name, title);
            if (result.success && result.employee) {
                setEmployees([...employees, result.employee as Employee]);
                toast({ title: "Başarılı", description: "Yeni personel eklendi." });
                setIsDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Ekleme başarısız." });
            }
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!selectedEmployee) return;

        setLoading(true);
        const result = await deleteTenantEmployee(selectedEmployee.id);

        if (result.success) {
            setEmployees(employees.filter(e => e.id !== selectedEmployee.id));
            toast({ title: "Başarılı", description: "Personel silindi." });
            setIsDeleteDialogOpen(false);
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error || "Silme işlemi başarısız." });
        }
        setLoading(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Çalışanlar / Personeller
                    </CardTitle>
                    <CardDescription>
                        İşletmenizdeki personelleri ekleyin. Bu personelleri takvimde randevu planlarken kullanabilirsiniz.
                    </CardDescription>
                </div>
                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Personel Ekle
                </Button>
            </CardHeader>
            <CardContent>
                {employees.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-lg">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h3 className="text-sm font-semibold text-slate-600">Henüz personel eklenmemiş</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Randevularınızı kişilere göre yönetebilmek için lütfen işletme personellerinizi ekleyin.
                        </p>
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ad Soyad</TableHead>
                                    <TableHead>Ünvan / Görev</TableHead>
                                    <TableHead className="text-right">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium text-slate-700">{employee.name}</TableCell>
                                        <TableCell className="text-slate-500">{employee.title || "-"}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                                                <Edit2 className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(employee)}>
                                                <Trash2 className="w-4 h-4 text-rose-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedEmployee ? "Personel Güncelle" : "Yeni Personel Ekle"}</DialogTitle>
                        <DialogDescription>
                            Personelin adını ve (opsiyonel) ünvanını giriniz.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ad Soyad *</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: Ahmet Yılmaz"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ünvan / Görev (Opsiyonel)</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Kuaför, Dövmeci, Danışman..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSave} disabled={loading || !name.trim()} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {loading ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personeli Sil</DialogTitle>
                        <DialogDescription>
                            <span className="font-bold text-slate-900">{selectedEmployee?.name}</span> isimli personeli silmek istediğinize emin misiniz?
                            <br /><br />
                            <strong className="text-rose-500">Dikkat:</strong> Bu kişiye ait tüm randevu kayıtları da veritabanından silinecektir!
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? "Siliniyor..." : "Evet, Sil"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
