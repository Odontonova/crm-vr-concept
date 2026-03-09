import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message || 'Erro ao criar conta', { closeButton: true });
        } else {
          toast.success('Conta criada com sucesso! Você já pode acessar o sistema.', { closeButton: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || 'Email ou senha incorretos', { closeButton: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(339,19%,31%)] items-center justify-center p-12 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(32,45%,63%)] opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[hsl(32,45%,63%)] opacity-10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-md text-center relative z-10">
          <div className="mb-10 flex flex-col items-center">
            <img
              src="https://izhbmjqyoglagooosmoc.supabase.co/storage/v1/object/public/media-mensagens/Logo/Logo%20VR%20Concept%20Dourada.png"
              alt="Logo VR Concept"
              className="h-40 w-auto mb-6 object-contain"
            />
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[hsl(32,45%,63%)] to-transparent mx-auto rounded-full mb-6" />
          </div>
          <p className="text-2xl text-[hsl(32,40%,95%)] leading-relaxed font-serif tracking-wide">
            Transformando sorrisos com<br />
            <span className="text-[hsl(32,45%,63%)] font-medium">excelência e cuidado</span>
          </p>
          <div className="mt-12 space-y-5 text-[hsl(32,40%,90%)] text-left pl-8 border-l border-[hsl(32,45%,63%)]/30">
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(32,45%,63%)]" />
              <span>Gestão de alunos integrada</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(32,45%,63%)]" />
              <span>Agendamentos inteligentes</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(32,45%,63%)]" />
              <span>Acompanhamento de tratamentos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[hsl(339,19%,31%)] font-serif tracking-tight">
              {isSignUp ? 'Criar conta' : 'Área Restrita'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? 'Preencha os dados para criar sua conta profissional' : 'Entre com suas credenciais de acesso'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  className="h-12 border-muted-foreground/20 focus:border-primary"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@moncao.com.br"
                className="h-12 border-muted-foreground/20 focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pr-10 border-muted-foreground/20 focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Lembrar-me
                  </label>
                </div>
              </div>
            )}

            <Button className="w-full h-12 text-base bg-[hsl(339,19%,31%)] hover:bg-[hsl(339,19%,25%)] text-white font-medium transition-all shadow-md hover:shadow-lg" size="lg" type="submit" disabled={loading}>
              {loading ? 'Processando...' : (isSignUp ? 'Criar conta' : 'Entrar')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Já possui acesso?' : 'Não possui acesso?'}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[hsl(32,45%,55%)] hover:text-[hsl(32,45%,45%)] font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Fazer login' : 'Solicitar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}