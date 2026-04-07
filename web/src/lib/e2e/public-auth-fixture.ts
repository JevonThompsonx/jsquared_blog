type SupabaseListUser = {
  id: string;
  email?: string | null;
};

type SupabaseListUsersResult = {
  data: {
    users: SupabaseListUser[];
  };
  error: {
    message: string;
  } | null;
};

type ListUsers = (pagination: { page: number; perPage: number }) => Promise<SupabaseListUsersResult>;

const SUPABASE_AUTH_PAGE_SIZE = 200;

export async function findSupabaseAuthUserByEmail(
  listUsers: ListUsers,
  email: string,
): Promise<SupabaseListUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; ; page += 1) {
    const result = await listUsers({ page, perPage: SUPABASE_AUTH_PAGE_SIZE });
    if (result.error) {
      throw new Error(`Failed to list Supabase users for E2E fixture setup: ${result.error.message}`);
    }

    const matchedUser = result.data.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    if (matchedUser) {
      return matchedUser;
    }

    if (result.data.users.length < SUPABASE_AUTH_PAGE_SIZE) {
      return null;
    }
  }
}
