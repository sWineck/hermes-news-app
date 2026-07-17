export type AccountRole = 'user' | 'admin'

export type AccountIdentity = {
  id: string
  role: AccountRole
}

export type UserPreferences = {
  feedIds: string[]
  favoriteArticleIds: string[]
  theme: 'light' | 'dark'
  search: string
  category: string
}

export type AccountDataEnvelope = {
  version: 1
  ownerId?: string
  preferences: UserPreferences
}

export interface AccountStorageAdapter {
  load(ownerId: string): Promise<AccountDataEnvelope | null>
  save(ownerId: string, data: AccountDataEnvelope): Promise<void>
  remove(ownerId: string): Promise<void>
  export(ownerId: string): Promise<AccountDataEnvelope | null>
}

export function createAnonymousAccountData(preferences: UserPreferences): AccountDataEnvelope {
  return { version: 1, preferences: { ...preferences, feedIds: [...preferences.feedIds], favoriteArticleIds: [...preferences.favoriteArticleIds] } }
}
