export interface User {
  uid: string;
  phone: string;
  displayName: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface UserCreateInput {
  phone: string;
  displayName: string;
}
