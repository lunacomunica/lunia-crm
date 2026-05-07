export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: 'manual' | 'whatsapp' | 'instagram' | 'ads' | 'indicacao';
  status: 'lead' | 'qualified' | 'customer' | 'lost';
  tags: string;
  notes: string | null;
  external_id: string | null;
  avatar_url: string | null;
  referred_by_id: number | null;
  referred_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyClient {
  id: number;
  name: string;
  segment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  instagram_handle: string | null;
  logo: string | null;
  active: number;
  content_count?: number;
  pending_approvals?: number;
  created_at: string;
}

export type ContentStatus = 'em_criacao' | 'em_revisao' | 'aguardando_aprovacao' | 'aprovado' | 'ajuste_solicitado' | 'agendado' | 'publicado';
export type ContentType = 'post' | 'reels' | 'story' | 'carrossel';

export interface ContentPiece {
  id: number;
  agency_client_id: number;
  client_name?: string;
  title: string;
  type: ContentType;
  caption: string | null;
  media_url: string | null;
  scheduled_date: string | null;
  objective: string | null;
  status: ContentStatus;
  creator_name?: string;
  comments?: ContentComment[];
  created_at: string;
  updated_at: string;
}

export interface ContentComment {
  id: number;
  content_piece_id: number;
  user_id: number;
  user_name: string;
  message: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  category: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface DealProduct {
  product_id: number;
  name: string;
  unit: string;
  category: string | null;
  quantity: number;
  unit_price: number;
}

export interface Deal {
  id: number;
  contact_id: number | null;
  contact_name?: string;
  contact_email?: string;
  title: string;
  value: number;
  stage: 'prospecting' | 'proposal' | 'negotiation' | 'closing';
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  products?: DealProduct[];
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  contact_id: number;
  contact_name?: string;
  contact_phone?: string;
  avatar_url?: string | null;
  platform: 'whatsapp' | 'instagram';
  external_id: string;
  status: 'active' | 'archived';
  last_message: string | null;
  last_message_time: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  external_id: string | null;
  timestamp: string;
}

export interface InstagramLead {
  id: number;
  form_id: string | null;
  form_name: string | null;
  lead_id: string;
  ad_id: string | null;
  campaign_name: string | null;
  contact_id: number | null;
  contact_name?: string | null;
  data: Record<string, any>;
  created_at: string;
}

export interface Activity {
  id: number;
  contact_id: number | null;
  contact_name?: string;
  deal_id: number | null;
  type: string;
  description: string;
  created_at: string;
}

export interface DashboardData {
  stats: {
    totalContacts: number;
    newLeadsThisWeek: number;
    activeDeals: number;
    pipelineValue: number;
    closingValue: number;
    totalConversations: number;
    unreadMessages: number;
    instagramLeads: number;
    unconvertedLeads: number;
  };
  dealsByStage: Array<{ stage: string; count: number; value: number }>;
  leadSources: Array<{ source: string; count: number }>;
  recentActivities: Activity[];
}
