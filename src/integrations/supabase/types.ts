export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      mensagens: {
        Row: {
          id: string
          lead_id: string | null
          user_id: string | null
          conteudo: string
          direcao: string
          remetente: string
          tipo_conteudo: string
          criado_em: string | null
          media_path: string | null
          id_mensagem: string | null
        }
        Insert: {
          id?: string
          lead_id?: string | null
          user_id?: string | null
          conteudo: string
          direcao: string
          remetente: string
          tipo_conteudo?: string
          criado_em?: string | null
          media_path?: string | null
          id_mensagem?: string | null
        }
        Update: {
          id?: string
          lead_id?: string | null
          user_id?: string | null
          conteudo?: string
          direcao?: string
          remetente?: string
          tipo_conteudo?: string
          criado_em?: string | null
          media_path?: string | null
          id_mensagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          campanha_id: string | null
          criado_em: string
          descricao: string
          id: string
          lead_id: string | null
          metadados: Json | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          campanha_id?: string | null
          criado_em?: string
          descricao: string
          id?: string
          lead_id?: string | null
          metadados?: Json | null
          tipo: string
          usuario_id: string
        }
        Update: {
          campanha_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          metadados?: Json | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_campaign_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          atualizado_em: string
          contagem_conversoes: number | null
          contagem_destinatarios: number | null
          contagem_enviados: number | null
          contagem_respostas: number | null
          contagem_visualizados: number | null
          criado_em: string
          data_agendamento: string | null
          descricao: string | null
          id: string
          intervalo_segundos: number | null
          media_url: string | null
          nome: string
          organization_id: string | null
          segmento: string | null
          segmento_config: Json | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeted_lead_ids: Json | null
          template_mensagem: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          contagem_conversoes?: number | null
          contagem_destinatarios?: number | null
          contagem_enviados?: number | null
          contagem_respostas?: number | null
          contagem_visualizados?: number | null
          criado_em?: string
          data_agendamento?: string | null
          descricao?: string | null
          id?: string
          intervalo_segundos?: number | null
          media_url?: string | null
          nome: string
          organization_id?: string | null
          segmento?: string | null
          segmento_config?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeted_lead_ids?: Json | null
          template_mensagem: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          contagem_conversoes?: number | null
          contagem_destinatarios?: number | null
          contagem_enviados?: number | null
          contagem_respostas?: number | null
          contagem_visualizados?: number | null
          criado_em?: string
          data_agendamento?: string | null
          descricao?: string | null
          id?: string
          intervalo_segundos?: number | null
          media_url?: string | null
          nome?: string
          organization_id?: string | null
          segmento?: string | null
          segmento_config?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeted_lead_ids?: Json | null
          template_mensagem?: string
          usuario_id?: string
        }
        Relationships: []
      }
      configuracoes_clinica: {
        Row: {
          endereco: Json | null
          mensagem_ausencia: string | null
          horario_funcionamento: Json | null
          cnpj: string | null
          criado_em: string
          moeda: string | null
          formato_data: string | null
          email: string | null
          id: string
          url_logo: string | null
          nome: string
          telefone: string | null
          fuso_horario: string | null
          atualizado_em: string
          usuario_id: string
        }
        Insert: {
          endereco?: Json | null
          mensagem_ausencia?: string | null
          horario_funcionamento?: Json | null
          cnpj?: string | null
          criado_em?: string
          moeda?: string | null
          formato_data?: string | null
          email?: string | null
          id?: string
          url_logo?: string | null
          nome: string
          telefone?: string | null
          fuso_horario?: string | null
          atualizado_em?: string
          usuario_id: string
        }
        Update: {
          endereco?: Json | null
          mensagem_ausencia?: string | null
          horario_funcionamento?: Json | null
          cnpj?: string | null
          criado_em?: string
          moeda?: string | null
          formato_data?: string | null
          email?: string | null
          id?: string
          url_logo?: string | null
          nome?: string
          telefone?: string | null
          fuso_horario?: string | null
          atualizado_em?: string
          usuario_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      integracoes: {
        Row: {
          criado_em: string
          credenciais: Json | null
          id: string
          ultima_sincronizacao: string | null
          nome: string
          configuracoes: Json | null
          status: string
          tipo: string
          atualizado_em: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          credenciais?: Json | null
          id?: string
          ultima_sincronizacao?: string | null
          nome: string
          configuracoes?: Json | null
          status?: string
          tipo: string
          atualizado_em?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          credenciais?: Json | null
          id?: string
          ultima_sincronizacao?: string | null
          nome?: string
          configuracoes?: Json | null
          status?: string
          tipo?: string
          atualizado_em?: string
          usuario_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          endereco: string | null
          idade: number | null
          queixa_principal: string
          cpf: string | null
          criado_em: string
          criativo: string | null
          email: string | null
          genero: string | null
          id: string
          ultimo_contato: string | null
          nome: string
          telefone: string
          origem: string
          etapa_id: number
          status: string
          atualizado_em: string
          usuario_id: string
          valor: number | null
        }
        Insert: {
          endereco?: string | null
          idade?: number | null
          queixa_principal: string
          cpf?: string | null
          criado_em?: string
          criativo?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          ultimo_contato?: string | null
          nome: string
          telefone: string
          origem: string
          etapa_id?: number
          status?: string
          atualizado_em?: string
          usuario_id: string
          valor?: number | null
        }
        Update: {
          endereco?: string | null
          idade?: number | null
          queixa_principal?: string
          cpf?: string | null
          criado_em?: string
          criativo?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          ultimo_contato?: string | null
          nome?: string
          telefone?: string
          origem?: string
          etapa_id?: number
          status?: string
          atualizado_em?: string
          usuario_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      memoria_agente_curso_odontonova: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      memoria_agente_odontonova: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      templates_mensagem: {
        Row: {
          categoria: string
          conteudo: string
          criado_em: string
          id: string
          esta_ativo: boolean | null
          nome: string
          atualizado_em: string
          contagem_uso: number | null
          usuario_id: string
          variaveis: Json | null
        }
        Insert: {
          categoria: string
          conteudo: string
          criado_em?: string
          id?: string
          esta_ativo?: boolean | null
          nome: string
          atualizado_em?: string
          contagem_uso?: number | null
          usuario_id: string
          variaveis?: Json | null
        }
        Update: {
          categoria?: string
          conteudo?: string
          criado_em?: string
          id?: string
          esta_ativo?: boolean | null
          nome?: string
          atualizado_em?: string
          contagem_uso?: number | null
          usuario_id?: string
          variaveis?: Json | null
        }
        Relationships: []
      }
      perfis: {
        Row: {
          url_avatar: string | null
          criado_em: string
          nome_completo: string | null
          id: string
          telefone: string | null
          atualizado_em: string
        }
        Insert: {
          url_avatar?: string | null
          criado_em?: string
          nome_completo?: string | null
          id: string
          telefone?: string | null
          atualizado_em?: string
        }
        Update: {
          url_avatar?: string | null
          criado_em?: string
          nome_completo?: string | null
          id?: string
          telefone?: string | null
          atualizado_em?: string
        }
        Relationships: []
      }
      etapas: {
        Row: {
          cor: string
          criado_em: string
          id: number
          nome: string
          posicao_ordem: number
        }
        Insert: {
          cor: string
          criado_em?: string
          id: number
          nome: string
          posicao_ordem: number
        }
        Update: {
          cor?: string
          criado_em?: string
          id?: number
          nome?: string
          posicao_ordem?: number
        }
        Relationships: []
      }
      usuarios_papeis: {
        Row: {
          criado_em: string
          id: string
          papel: Database["public"]["Enums"]["app_role"]
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          papel: Database["public"]["Enums"]["app_role"]
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["app_role"]
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      detalhes_usuario: {
        Row: {
          id: string | null
          nome_completo: string | null
          url_avatar: string | null
          telefone: string | null
          email: string | null
          papel: Database["public"]["Enums"]["app_role"] | null
          ultimo_acesso_em: string | null
        }
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "atendente" | "dentista" | "visualizador",
      campaign_status: "draft" | "active" | "scheduled" | "completed" | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "atendente", "dentista", "visualizador"],
    },
  },
} as const