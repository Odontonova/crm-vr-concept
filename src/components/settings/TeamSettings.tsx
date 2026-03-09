import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, User, Users, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export function TeamSettings() {
  const { profile, role, isLoading: isLoadingProfile } = useProfile();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "atendente" });

  const { data: members = [], isLoading: isLoadingMembers, refetch } = useQuery({
    queryKey: ['team_members', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      // 1. Busca todos os perfis da organização
      const { data: profiles, error: profilesError } = await supabase
        .from('perfis')
        .select('id, nome_completo, url_avatar')
        .eq('organization_id', profile.organization_id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map(p => p.id);

      // 2. Busca os papéis desses usuários separadamente
      const { data: roles, error: rolesError } = await supabase
        .from('usuarios_papeis')
        .select('usuario_id, papel')
        .in('usuario_id', profileIds);

      if (rolesError) throw rolesError;

      // 3. Mescla os dados
      const mergedMembers = profiles.map(p => {
        const userRole = roles?.find(r => r.usuario_id === p.id)?.papel || 'atendente';
        return {
          ...p,
          role: userRole
        };
      });

      return mergedMembers;
    },
    enabled: !!profile?.organization_id
  });

  const createMember = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData
      });

      if (error) throw new Error("Erro de conexão com o servidor.");
      if (data && data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setNewUser({ fullName: "", email: "", password: "", role: "atendente" });

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['team_members'] });

      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar usuário.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    createMember.mutate(newUser);
  };

  if (isLoadingProfile) {
    return <div className="p-8 text-center text-muted-foreground">Carregando perfil...</div>;
  }

  if (role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar a equipe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestão de Equipe</CardTitle>
          <CardDescription>Gerencie quem tem acesso ao sistema da sua empresa.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Recarregar lista">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Membro da Equipe</DialogTitle>
                <DialogDescription>Crie uma conta para um novo colaborador.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Provisória</Label>
                  <Input id="password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="dentista">Dentista</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMember.isPending}>
                    {createMember.isPending ? 'Criando...' : 'Criar Conta'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingMembers ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 opacity-50" />
                    <p>Nenhum membro encontrado ou empresa não configurada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    {member.nome_completo || 'Sem nome'}
                    {member.id === profile?.id && <Badge variant="outline" className="ml-2">Você</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? 'Administrador' : member.role === 'dentista' ? 'Dentista' : 'Atendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}