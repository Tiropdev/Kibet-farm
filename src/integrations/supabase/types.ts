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
      activity_log: {
        Row: {
          cow_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          user_id: string
        }
        Insert: {
          cow_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["activity_kind"]
          user_id: string
        }
        Update: {
          cow_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_records: {
        Row: {
          completed_at: string | null
          completion_note: string | null
          cow_id: string
          created_at: string
          expected_due_date: string | null
          heat_date: string | null
          id: string
          insemination_date: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_note?: string | null
          cow_id: string
          created_at?: string
          expected_due_date?: string | null
          heat_date?: string | null
          id?: string
          insemination_date?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_note?: string | null
          cow_id?: string
          created_at?: string
          expected_due_date?: string | null
          heat_date?: string | null
          id?: string
          insemination_date?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      calves: {
        Row: {
          birth_date: string
          created_at: string
          id: string
          mother_cow_id: string
          name: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string
          created_at?: string
          id?: string
          mother_cow_id: string
          name?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          id?: string
          mother_cow_id?: string
          name?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calves_mother_cow_id_fkey"
            columns: ["mother_cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      cows: {
        Row: {
          breed: string | null
          created_at: string
          dam: string | null
          date_of_birth: string | null
          id: string
          name: string
          notes: string | null
          number_of_calves: number
          photo_url: string | null
          sire: string | null
          status: Database["public"]["Enums"]["cow_status"]
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          created_at?: string
          dam?: string | null
          date_of_birth?: string | null
          id?: string
          name: string
          notes?: string | null
          number_of_calves?: number
          photo_url?: string | null
          sire?: string | null
          status?: Database["public"]["Enums"]["cow_status"]
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breed?: string | null
          created_at?: string
          dam?: string | null
          date_of_birth?: string | null
          id?: string
          name?: string
          notes?: string | null
          number_of_calves?: number
          photo_url?: string | null
          sire?: string | null
          status?: Database["public"]["Enums"]["cow_status"]
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_records: {
        Row: {
          cow_id: string
          created_at: string
          feed_type: string
          id: string
          notes: string | null
          quantity_kg: number | null
          record_date: string
          user_id: string
        }
        Insert: {
          cow_id: string
          created_at?: string
          feed_type: string
          id?: string
          notes?: string | null
          quantity_kg?: number | null
          record_date?: string
          user_id: string
        }
        Update: {
          cow_id?: string
          created_at?: string
          feed_type?: string
          id?: string
          notes?: string | null
          quantity_kg?: number | null
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          completed_at: string | null
          completion_note: string | null
          cow_id: string
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["health_kind"]
          next_due_date: string | null
          notes: string | null
          record_date: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_note?: string | null
          cow_id: string
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["health_kind"]
          next_due_date?: string | null
          notes?: string | null
          record_date?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_note?: string | null
          cow_id?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["health_kind"]
          next_due_date?: string | null
          notes?: string | null
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_records: {
        Row: {
          am_litres: number
          cow_id: string
          created_at: string
          id: string
          noon_litres: number
          notes: string | null
          pm_litres: number
          record_date: string
          total_litres: number | null
          user_id: string
        }
        Insert: {
          am_litres?: number
          cow_id: string
          created_at?: string
          id?: string
          noon_litres?: number
          notes?: string | null
          pm_litres?: number
          record_date?: string
          total_litres?: number | null
          user_id: string
        }
        Update: {
          am_litres?: number
          cow_id?: string
          created_at?: string
          id?: string
          noon_litres?: number
          notes?: string | null
          pm_litres?: number
          record_date?: string
          total_litres?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          notifications_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          notifications_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_kind: "milk" | "breeding" | "health" | "feeding" | "calf" | "cow"
      cow_status: "lactating" | "dry" | "pregnant" | "sick" | "calf"
      health_kind: "vaccination" | "deworming" | "treatment" | "vet_note"
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
      activity_kind: ["milk", "breeding", "health", "feeding", "calf", "cow"],
      cow_status: ["lactating", "dry", "pregnant", "sick", "calf"],
      health_kind: ["vaccination", "deworming", "treatment", "vet_note"],
    },
  },
} as const
