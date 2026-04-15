export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
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
  view_count: number;
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
