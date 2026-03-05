import db from '@/lib/db'


export type Provider = 'LOCAL' | 'GOOGLE' | 'APPLE'

export interface CreateUserData {
  email:      string
  firstName:  string
  lastName:   string
  provider:   Provider
  providerId?: string    
}

export interface UserRecord {
  user_id:    string
  email:      string
  first_name: string
  last_name:  string
  status:     string
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await db.query<UserRecord>(
    `SELECT user_id, email, first_name, last_name, status
     FROM users
     WHERE email      = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [email]
  )
  return result.rows[0] ?? null
}


export async function findUserByProviderId(
  provider:   Provider,
  providerId: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRecord>(
    `SELECT u.user_id, u.email, u.first_name, u.last_name, u.status
     FROM users u
     JOIN user_identities ui ON ui.user_id = u.user_id
     WHERE ui.provider    = $1
       AND ui.provider_id = $2
       AND u.deleted_at   IS NULL
     LIMIT 1`,
    [provider, providerId]
  )
  return result.rows[0] ?? null
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const result = await db.query<UserRecord>(
    `SELECT user_id, email, first_name, last_name, status
     FROM users
     WHERE user_id  = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  )
  return result.rows[0] ?? null
}


export async function createUserFromClerk(data: CreateUserData): Promise<string> {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    const userResult = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, first_name, last_name)
       VALUES ($1, $2, $3)
       RETURNING user_id`,
      [data.email, data.firstName, data.lastName]
    )
    const userId = userResult.rows[0].user_id

    if (data.provider === 'LOCAL') {
       await client.query(
        `INSERT INTO user_identities (user_id, provider, provider_id, password_hash)
         VALUES ($1, 'LOCAL', NULL, 'MANAGED_BY_CLERK')`,
        [userId]
      )
    } else {
      await client.query(
        `INSERT INTO user_identities (user_id, provider, provider_id)
         VALUES ($1, $2, $3)`,
        [userId, data.provider, data.providerId]
      )
    }

    await client.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [userId]
    )

    await client.query(
      `INSERT INTO email_notifications
         (user_id, notification_type, template_data, status, scheduled_for,
          related_entity_type, related_entity_id)
       VALUES ($1, 'WELCOME', $2::jsonb, 'PENDING', NOW(), 'USER', $1)`,
      [
        userId,
        JSON.stringify({ first_name: data.firstName, email: data.email }),
      ]
    )

    await client.query('COMMIT')
    return userId

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}