import { supabase } from './supabase.js'

export async function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'startGoogleSignIn' }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (response?.success) resolve(response.user)
      else reject(new Error(response?.error || 'Sign in failed'))
    })
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCloudUser() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}
