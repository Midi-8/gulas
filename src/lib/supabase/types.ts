export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          full_name: string;
          slug: string;
          tagline: string | null;
          description: string | null;
          location: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          currency: string;
          timezone: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          is_open: boolean;
          opening_hours: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          full_name: string;
          slug: string;
          tagline?: string | null;
          description?: string | null;
          location?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          currency?: string;
          timezone?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          opening_hours?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          full_name?: string;
          slug?: string;
          tagline?: string | null;
          description?: string | null;
          location?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          currency?: string;
          timezone?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          opening_hours?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          restaurant_id: string | null;
          full_name: string | null;
          role: 'owner' | 'manager' | 'staff';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          restaurant_id?: string | null;
          full_name?: string | null;
          role?: 'owner' | 'manager' | 'staff';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string | null;
          full_name?: string | null;
          role?: 'owner' | 'manager' | 'staff';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          slug: string;
          description: string | null;
          subtitle: string | null;
          display_order: number;
          is_active: boolean;
          is_specialty: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          slug: string;
          description?: string | null;
          subtitle?: string | null;
          display_order?: number;
          is_active?: boolean;
          is_specialty?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          subtitle?: string | null;
          display_order?: number;
          is_active?: boolean;
          is_specialty?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          cost: number | null;
          image_url: string | null;
          is_available: boolean;
          display_order: number;
          badges: string[];
          unit_quantity: string | null;
          includes_notes: string | null;
          customization_note: string | null;
          allergens: string[];
          prep_time_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          cost?: number | null;
          image_url?: string | null;
          is_available?: boolean;
          display_order?: number;
          badges?: string[];
          unit_quantity?: string | null;
          includes_notes?: string | null;
          customization_note?: string | null;
          allergens?: string[];
          prep_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          cost?: number | null;
          image_url?: string | null;
          is_available?: boolean;
          display_order?: number;
          badges?: string[];
          unit_quantity?: string | null;
          includes_notes?: string | null;
          customization_note?: string | null;
          allergens?: string[];
          prep_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          number: number;
          name: string;
          qr_token: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          number: number;
          name: string;
          qr_token?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          number?: number;
          name?: string;
          qr_token?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_counters: {
        Row: {
          restaurant_id: string;
          last_order_number: number;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          last_order_number?: number;
          updated_at?: string;
        };
        Update: {
          restaurant_id?: string;
          last_order_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          table_number: number;
          order_number: number;
          status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          subtotal: number;
          total: number;
          customer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id?: string | null;
          table_number: number;
          order_number: number;
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          subtotal?: number;
          total?: number;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string | null;
          table_number?: number;
          order_number?: number;
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          subtotal?: number;
          total?: number;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          unit_cost: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          unit_cost?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          unit_cost?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_next_order_number: {
        Args: {
          p_restaurant_id: string;
        };
        Returns: number;
      };
      get_public_order_status: {
          Args: {
            p_order_id: string;
            p_tracking_token?: string | null;
          };
          Returns: Json;
        };
        create_order_atomic: {
        Args: {
          p_restaurant_slug: string;
          p_table_number: number;
          p_customer_notes: string | null;
          p_items: {
            product_id: string;
            quantity: number;
            notes: string | null;
          }[];
        };
        Returns: Json;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}


