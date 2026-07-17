export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bvn_hash: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
}
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn?: string;
}
export const presentUser = (u: UserRow): object => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  phone: u.phone,
  status: u.status,
  createdAt: u.created_at,
});
