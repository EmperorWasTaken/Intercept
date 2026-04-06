import { supabase } from './supabase.js'
import { getCloudUser } from './cloud-auth.js'

const LAST_SYNCED_KEY = 'cloudLastSynced'

export async function getLastSynced() {
  const r = await chrome.storage.local.get(LAST_SYNCED_KEY)
  return r[LAST_SYNCED_KEY] ?? null
}

async function setLastSynced() {
  await chrome.storage.local.set({ [LAST_SYNCED_KEY]: Date.now() })
}

export async function pushProfiles(profiles) {
  const user = await getCloudUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const rows = profiles.map(p => ({
    user_id: user.id,
    local_id: p.id,
    name: p.name,
    data: p,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('cloud_profiles')
    .upsert(rows, { onConflict: 'user_id,local_id' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function pullProfiles() {
  const { data, error } = await supabase
    .from('cloud_profiles')
    .select('data')
    .order('updated_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, profiles: data.map(r => r.data) }
}

export async function deleteCloudProfile(localId) {
  const user = await getCloudUser()
  if (!user) return

  await supabase
    .from('cloud_profiles')
    .delete()
    .eq('user_id', user.id)
    .eq('local_id', localId)
}

export async function syncProfiles(localProfiles, saveAllProfilesFn) {
  const pushResult = await pushProfiles(localProfiles)
  if (!pushResult.success) return pushResult

  const pullResult = await pullProfiles()
  if (!pullResult.success) return pullResult

  const localIds = new Set(localProfiles.map(p => p.id))
  const newFromCloud = pullResult.profiles.filter(p => !localIds.has(p.id))

  if (newFromCloud.length > 0) {
    await saveAllProfilesFn([...localProfiles, ...newFromCloud])
  }

  await setLastSynced()
  return { success: true, added: newFromCloud.length }
}
