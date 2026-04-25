import { createContext } from "react";
import type { User } from "../types";

export interface PendingMobileVerification {
  user_id: string;
  mobile_number: string;
  expires_in?: number;
  otp_code?: string;
  delivery_method?: string;
  message?: string;
}

export interface RegisterResult {
  requiresVerification: boolean;
  message?: string;
  verification?: PendingMobileVerification;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName: string, mobileNumber: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
