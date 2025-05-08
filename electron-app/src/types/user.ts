export interface UserBase {
  email: string;
  name?: string;
  picture?: string;
}

export interface UserCreate extends UserBase {
  firebase_uid: string;
}

export interface UserUpdate {
  name?: string;
  picture?: string;
}

export interface UserInDB extends UserBase {
  id: string;
  firebase_uid: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  token?: string;
}

export interface FirebaseAuthRequest {
  id_token: string;
}

export interface EmailSignUpRequest {
  email: string;
  password: string;
  name?: string;
}

export interface EmailSignInRequest {
  email: string;
  password: string;
} 