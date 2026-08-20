export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type SinfoniEntityRow = {
  organization_id: string;
};

type NoRelationships = [];

export interface Database {
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      projects: {
        Row: SinfoniEntityRow & {
          id: string;
          reference: string;
          title: string;
          description: string;
          type: string;
          status: string;
          budget_total: number;
          budget_consumed: number;
          start_date: string | null;
          expected_end_date: string | null;
          actual_end_date: string | null;
          owner_id: string;
          owner_name: string;
          contractor_id: string | null;
          contractor_name: string | null;
          location: string;
          commune_insee_code: string | null;
          source_demand: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          reference: string;
          title: string;
          description?: string;
          type: string;
          status: string;
          budget_total?: number;
          budget_consumed?: number;
          start_date?: string | null;
          expected_end_date?: string | null;
          actual_end_date?: string | null;
          owner_id?: string;
          owner_name?: string;
          contractor_id?: string | null;
          contractor_name?: string | null;
          location?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          reference?: string;
          title?: string;
          description?: string;
          type?: string;
          status?: string;
          budget_total?: number;
          budget_consumed?: number;
          start_date?: string | null;
          expected_end_date?: string | null;
          actual_end_date?: string | null;
          owner_id?: string;
          owner_name?: string;
          contractor_id?: string | null;
          contractor_name?: string | null;
          location?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      workflow_steps: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          step_key: string;
          step_label: string;
          step_order: number;
          status: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          step_key: string;
          step_label: string;
          step_order?: number;
          status?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          step_key?: string;
          step_label?: string;
          step_order?: number;
          status?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      documents: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          name: string;
          category: string;
          size: string;
          file_url: string | null;
          mime_type: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          name: string;
          category: string;
          size?: string;
          file_url?: string | null;
          mime_type?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          name?: string;
          category?: string;
          size?: string;
          file_url?: string | null;
          mime_type?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      activity_logs: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string;
          user_name: string;
          user_role: string;
          action: string;
          target_type: string;
          target_id: string;
          target_label: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          user_name?: string;
          user_role?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          target_label?: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          user_name?: string;
          user_role?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          target_label?: string;
          timestamp?: string;
        };
        Relationships: NoRelationships;
      };
      notifications: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          project_id: string | null;
          project_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          project_id?: string | null;
          project_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          project_id?: string | null;
          project_reference?: string | null;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      signatures: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          project_reference: string;
          document_name: string;
          signer_name: string;
          signer_role: string;
          signature_data: string;
          signature_type: string;
          signed_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          project_reference?: string;
          document_name?: string;
          signer_name?: string;
          signer_role?: string;
          signature_data?: string;
          signature_type?: string;
          signed_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          project_reference?: string;
          document_name?: string;
          signer_name?: string;
          signer_role?: string;
          signature_data?: string;
          signature_type?: string;
          signed_at?: string;
        };
        Relationships: NoRelationships;
      };
      field_photos: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          project_reference: string;
          photo_url: string;
          caption: string;
          taken_by: string;
          taken_at: string;
          gps_lat: number | null;
          gps_lng: number | null;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          project_reference?: string;
          photo_url?: string;
          caption?: string;
          taken_by?: string;
          taken_at?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          project_reference?: string;
          photo_url?: string;
          caption?: string;
          taken_by?: string;
          taken_at?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
        };
        Relationships: NoRelationships;
      };
      saved_reports: {
        Row: SinfoniEntityRow & {
          id: string;
          name: string;
          filters: Json;
          columns: string[];
          created_by: string;
          created_at: string;
          last_run_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          name?: string;
          filters?: Json;
          columns?: string[];
          created_by?: string;
          created_at?: string;
          last_run_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          filters?: Json;
          columns?: string[];
          created_by?: string;
          created_at?: string;
          last_run_at?: string | null;
        };
        Relationships: NoRelationships;
      };
      dashboard_widgets: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string;
          widget_key: string;
          position: number;
          visible: boolean;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          widget_key?: string;
          position?: number;
          visible?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          widget_key?: string;
          position?: number;
          visible?: boolean;
        };
        Relationships: NoRelationships;
      };
      users: {
        Row: SinfoniEntityRow & {
          id: string;
          name: string;
          email: string;
          role: string;
          avatar: string;
          active: boolean;
          commune_insee_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          name: string;
          email: string;
          role: string;
          avatar?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          role?: string;
          avatar?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      chantiers: {
        Row: SinfoniEntityRow & {
          id: string;
          code: string | null;
          name: string;
          address: string | null;
          status: string;
          created_at: string;
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          code?: string | null;
          name: string;
          address?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string | null;
          name?: string;
          address?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      contacts: {
        Row: SinfoniEntityRow & {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          role: string;
          department: string;
          parent_contact_id: string | null;
          avatar_url: string | null;
          electrical_habilitations: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          first_name: string;
          last_name: string;
          email?: string;
          phone?: string;
          role?: string;
          department?: string;
          parent_contact_id?: string | null;
          avatar_url?: string | null;
          electrical_habilitations?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          role?: string;
          department?: string;
          parent_contact_id?: string | null;
          avatar_url?: string | null;
          electrical_habilitations?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      energy_assets: {
        Row: SinfoniEntityRow & {
          id: string;
          commune_insee_code: string;
          name: string;
          type: string;
          status: string;
          latitude: number;
          longitude: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          commune_insee_code: string;
          name: string;
          type: string;
          status?: string;
          latitude: number;
          longitude: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          commune_insee_code?: string;
          name?: string;
          type?: string;
          status?: string;
          latitude?: number;
          longitude?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      tickets_maintenance: {
        Row: SinfoniEntityRow & {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          asset_id: string;
          commune_insee_code: string;
          created_by: string;
          assigned_to_provider_id: string | null;
          assigned_contact_id: string | null;
          scheduled_start: string | null;
          scheduled_end: string | null;
          duration_hours: number;
          required_habilitations: string[];
        };
        Insert: {
          id?: string;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          description?: string;
          status?: string;
          priority?: string;
          asset_id: string;
          commune_insee_code: string;
          created_by: string;
          assigned_to_provider_id?: string | null;
          assigned_contact_id?: string | null;
          scheduled_start?: string | null;
          scheduled_end?: string | null;
          duration_hours?: number;
          required_habilitations?: string[];
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          asset_id?: string;
          commune_insee_code?: string;
          created_by?: string;
          assigned_to_provider_id?: string | null;
          assigned_contact_id?: string | null;
          scheduled_start?: string | null;
          scheduled_end?: string | null;
          duration_hours?: number;
          required_habilitations?: string[];
        };
        Relationships: NoRelationships;
      };
      tickets_maintenance_enriched: {
        Row: SinfoniEntityRow & {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          asset_id: string;
          commune_insee_code: string;
          created_by: string;
          assigned_to_provider_id: string | null;
          assigned_contact_id: string | null;
          scheduled_start: string | null;
          scheduled_end: string | null;
          duration_hours: number;
          required_habilitations: string[];
          assigned_contact_first_name: string | null;
          assigned_contact_last_name: string | null;
          assigned_contact_email: string | null;
          assigned_contact_phone: string | null;
          assigned_contact_role: string | null;
          assigned_contact_department: string | null;
          assigned_contact_habilitations: string[] | null;
        };
        Insert: {
          [_ in never]: never;
        };
        Update: {
          [_ in never]: never;
        };
        Relationships: NoRelationships;
      };
      bpu_catalog: {
        Row: SinfoniEntityRow & {
          id: string;
          designation: string;
          unit: string;
          unit_price_ht: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          designation: string;
          unit?: string;
          unit_price_ht?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          designation?: string;
          unit?: string;
          unit_price_ht?: number;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      project_quote_lines: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          bpu_id: string | null;
          designation: string;
          quantity: number;
          unit_price_ht: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          bpu_id?: string | null;
          designation: string;
          quantity?: number;
          unit_price_ht?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          bpu_id?: string | null;
          designation?: string;
          quantity?: number;
          unit_price_ht?: number;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      project_timesheets: {
        Row: SinfoniEntityRow & {
          id: string;
          project_id: string;
          company_name: string;
          user_name: string;
          hours: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          project_id: string;
          company_name?: string;
          user_name?: string;
          hours?: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          company_name?: string;
          user_name?: string;
          hours?: number;
          description?: string | null;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      richard_sessions: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string;
          user_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      richard_messages: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string | null;
          session_id: string;
          message_id: string;
          role: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          session_id: string;
          message_id: string;
          role: string;
          payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          session_id?: string;
          message_id?: string;
          role?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
      jarvis_messages: {
        Row: SinfoniEntityRow & {
          id: string;
          user_id: string | null;
          session_id: string;
          message_id: string;
          role: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          session_id: string;
          message_id: string;
          role: string;
          payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          session_id?: string;
          message_id?: string;
          role?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: NoRelationships;
      };
    };
    Functions: {};
    Enums: {};
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type PublicViewName = keyof Database['public']['Views'];
export type PublicViewRow<T extends PublicViewName> = Database['public']['Views'][T]['Row'];
