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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_signals: {
        Row: {
          applications_90d: number | null
          avg_reply_hours: number | null
          candidate_id: string
          engagement_score: number | null
          last_active_at: string | null
          logins_30d: number | null
          raw: Json | null
          response_rate: number | null
          tenure_months_avg: number | null
        }
        Insert: {
          applications_90d?: number | null
          avg_reply_hours?: number | null
          candidate_id: string
          engagement_score?: number | null
          last_active_at?: string | null
          logins_30d?: number | null
          raw?: Json | null
          response_rate?: number | null
          tenure_months_avg?: number | null
        }
        Update: {
          applications_90d?: number | null
          avg_reply_hours?: number | null
          candidate_id?: string
          engagement_score?: number | null
          last_active_at?: string | null
          logins_30d?: number | null
          raw?: Json | null
          response_rate?: number | null
          tenure_months_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_signals_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          education: string | null
          embedding: string | null
          experience_years: number | null
          external_id: string | null
          headline: string | null
          id: string
          location: string | null
          name: string
          parsed: Json | null
          raw_profile: Json | null
          skills: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          education?: string | null
          embedding?: string | null
          experience_years?: number | null
          external_id?: string | null
          headline?: string | null
          id?: string
          location?: string | null
          name: string
          parsed?: Json | null
          raw_profile?: Json | null
          skills?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          education?: string | null
          embedding?: string | null
          experience_years?: number | null
          external_id?: string | null
          headline?: string | null
          id?: string
          location?: string | null
          name?: string
          parsed?: Json | null
          raw_profile?: Json | null
          skills?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          description: string
          embedding: string | null
          id: string
          parsed: Json | null
          raw_requirements: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          embedding?: string | null
          id?: string
          parsed?: Json | null
          raw_requirements?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          parsed?: Json | null
          raw_requirements?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ranking_results: {
        Row: {
          behavioral_score: number
          candidate_id: string
          experience_score: number
          final_score: number
          id: string
          rank: number
          reasoning: Json | null
          run_id: string
          semantic_score: number
          skill_score: number
        }
        Insert: {
          behavioral_score: number
          candidate_id: string
          experience_score: number
          final_score: number
          id?: string
          rank: number
          reasoning?: Json | null
          run_id: string
          semantic_score: number
          skill_score: number
        }
        Update: {
          behavioral_score?: number
          candidate_id?: string
          experience_score?: number
          final_score?: number
          id?: string
          rank?: number
          reasoning?: Json | null
          run_id?: string
          semantic_score?: number
          skill_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          candidates_evaluated: number | null
          created_at: string
          id: string
          job_id: string
          params: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          candidates_evaluated?: number | null
          created_at?: string
          id?: string
          job_id: string
          params?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          candidates_evaluated?: number | null
          created_at?: string
          id?: string
          job_id?: string
          params?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rankings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_candidates: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
