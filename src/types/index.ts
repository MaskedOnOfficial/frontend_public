export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_rating: number;
  total_ratings: number;
  parties_hosted: number;
  parties_attended: number;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Party {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  location_name: string;
  location_city: string;
  latitude: number | null;
  longitude: number | null;
  date_time: string;
  end_time: string | null;
  max_capacity: number;
  current_attendees: number;
  ticket_price: number;
  currency: string;
  cover_image_url: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled" | "archived";
  tags: string | null;
  min_rating: number;
  // Privacy & access
  is_private: boolean;
  private_code?: string | null;  // only returned to host
  allow_photos: boolean;
  // Party attributes
  food_type: "veg" | "non_veg" | "vegan" | null;
  allows_alcohol: boolean;
  allows_smoking: boolean;
  allows_other_substances: boolean;
  // Structured location
  location_country: string | null;
  location_state: string | null;
  location_district: string | null;
  created_at: string;
  updated_at: string;
  // Joined host fields
  host_username?: string;
  host_display_name?: string;
  host_avatar_url?: string | null;
  host_social_rating?: number;
  // Friends attending (enriched by discover endpoint)
  friends_attending?: number;
  friends_attending_avatars?: { user_id: string; display_name: string; avatar_url: string | null }[];
}

export interface PartyRequest {
  id: string;
  party_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  message: string | null;
  requested_at: string;
  responded_at: string | null;
  // Joined user fields
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  social_rating?: number;
  parties_attended?: number;
  // Joined party fields
  party_title?: string;
  party_date_time?: string;
  party_location_city?: string;
  party_cover_image_url?: string | null;
  party_ticket_price?: number;
  party_max_capacity?: number;
  party_current_attendees?: number;
  party_host_id?: string;
  party_end_time?: string | null;
  party_tags?: string | null;
}

export interface Payment {
  id: string;
  payer_id: string;
  host_id: string;
  party_id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "refunded";
  mock_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
  party_title?: string;
}

export interface Attendee {
  id: string;
  party_id: string;
  user_id: string;
  payment_id: string | null;
  checked_in: number;
  joined_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  social_rating?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export interface Photo {
  id: string;
  user_id: string;
  party_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  global_visibility: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: number;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  party_id: string;
  guest_id: string;
  host_id: string;
  created_at: string;
  party_title: string;
  party_cover_image_url: string | null;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface PartyAnnouncement {
  id: string;
  party_id: string;
  host_id: string;
  body: string;
  created_at: string;
}

export interface FriendUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  social_rating: number;
}

export interface PendingFriendRequest extends FriendUser {
  created_at: string;
}
