import { supabase } from './supabase.js'
import { getCloudUser } from './cloud-auth.js'

export async function getMyOrg() {
  const user = await getCloudUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('org_members')
    .select('role, orgs(id, name, seat_limit, admin_id)')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return { role: data.role, ...data.orgs }
}

export async function getOrgProfiles(orgId) {
  const { data, error } = await supabase
    .from('org_profiles')
    .select('id, name, data, updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, profiles: data }
}

export async function getOrgMembers(orgId) {
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, role, joined_at')
    .eq('org_id', orgId)

  if (error) return { success: false, error: error.message }
  return { success: true, members: data }
}

export async function shareProfileToOrg(orgId, profile) {
  const user = await getCloudUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const { error } = await supabase
    .from('org_profiles')
    .insert({
      org_id: orgId,
      created_by: user.id,
      name: profile.name,
      data: profile,
      updated_at: new Date().toISOString(),
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteOrgProfile(profileId) {
  const { error } = await supabase
    .from('org_profiles')
    .delete()
    .eq('id', profileId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function inviteMember(orgId, email) {
  const user = await getCloudUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const { error } = await supabase
    .from('org_invites')
    .insert({ org_id: orgId, email, invited_by: user.id })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
