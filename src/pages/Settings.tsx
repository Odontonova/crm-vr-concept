import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Building2,
  Save,
  Palette,
  Users,
  Tag,
  GitBranch,
  Radio
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { PhoneInput } from "@/components/MaskedInput";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { TagSettings } from "@/components/settings/TagSettings";
import { PipelineSettings } from "@/components/settings/PipelineSettings";
import { SourceSettings } from "@/components/settings/SourceSettings";

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const { user } = useAuth();
  const { profile, role, isLoading: isLoadingProfile, updateProfile } = useProfile();
  const { settings, updateSettings } = useClinicSettings();

  const [profileForm, setProfileForm] = useState({ nome_completo: '', telefone: '' });
  const [clinicForm, setClinicForm] = useState({ nome: '', cnpj: '', email: '', telefone: '' });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        nome_completo: profile.nome_completo || '',
        telefone: profile.telefone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setClinicForm({
        nome: s.nome || '',
        cnpj: s.cnpj || '',
        email: s.email || '',
        telefone: s.telefone || '',
      });
    }
  }, [settings]);

  const handleProfileSave = () => {
    updateProfile(profileForm);
  };

  const handleClinicSave = () => {
    updateSettings(clinicForm);
  };

  // Se o role ainda não carregou (undefined) ou é admin, mostrar abas de admin
  // Se role for null/undefined (ainda carregando), não oculta (evita flash)
  const isNotAdmin = role !== undefined && role !== 'admin';

  const menuItems = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "clinic", label: "Dados da Empresa", icon: Building2 },
    { id: "team", label: "Equipe", icon: Users, hidden: isNotAdmin },
    { id: "pipeline", label: "Etapas do Pipeline", icon: GitBranch, hidden: isNotAdmin },
    { id: "sources", label: "Fontes", icon: Radio, hidden: isNotAdmin },
    { id: "tags", label: "Etiquetas", icon: Tag },
    { id: "appearance", label: "Aparência", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as preferências e configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {menuItems.filter(item => !item.hidden).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left
                      ${isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Gerencie suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.url_avatar || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {profile?.nome_completo?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullname">Nome Completo</Label>
                    <Input id="fullname" value={profileForm.nome_completo} onChange={e => setProfileForm({ ...profileForm, nome_completo: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={user?.email || ''} className="mt-1.5" readOnly disabled />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <PhoneInput id="phone" value={profileForm.telefone} onChange={e => setProfileForm({ ...profileForm, telefone: e.target.value })} className="mt-1.5" />
                  </div>
                </div>

                <Button className="bg-primary hover:bg-primary/90" onClick={handleProfileSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "clinic" && (
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações da sua empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinic-name">Nome da Empresa</Label>
                    <Input id="clinic-name" value={clinicForm.nome} onChange={e => setClinicForm({ ...clinicForm, nome: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" value={clinicForm.cnpj} onChange={e => setClinicForm({ ...clinicForm, cnpj: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="clinic-email">E-mail Principal</Label>
                    <Input id="clinic-email" type="email" value={clinicForm.email} onChange={e => setClinicForm({ ...clinicForm, email: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="clinic-phone">Telefone Principal</Label>
                    <PhoneInput id="clinic-phone" value={clinicForm.telefone} onChange={e => setClinicForm({ ...clinicForm, telefone: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleClinicSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "team" && <TeamSettings />}

          {activeSection === "pipeline" && <PipelineSettings />}

          {activeSection === "sources" && <SourceSettings />}

          {activeSection === "tags" && <TagSettings />}

          {activeSection === "appearance" && <ThemeSettings />}
        </div>
      </div>
    </div>
  );
}