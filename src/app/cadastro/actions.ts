'use server'

import { createClient } from '@supabase/supabase-js'

export async function registerAction(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.' }
  }
  if (password !== confirm) {
    return { error: 'As senhas não coincidem.' }
  }

  // Service role: cria usuário + perfil sem depender de sessão ativa
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verificar se email já existe
  const { data: existing } = await admin
    .from('photographers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { error: 'Este email já está cadastrado.' }
  }

  // Criar usuário no Auth
  const { data, error: signUpError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma email automaticamente
    user_metadata: { name },
  })

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { error: 'Este email já está cadastrado.' }
    }
    return { error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  const userId = data.user?.id
  if (!userId) return { error: 'Erro inesperado. Tente novamente.' }

  // Upsert: cria ou atualiza o perfil (trigger pode ter inserido registro vazio)
  const { error: profileError } = await admin.from('photographers').upsert({
    id: userId,
    name,
    email,
    watermark: `© ${name}`,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: 'Erro ao salvar perfil. Tente novamente.' }
  }

  return { ok: true }
}
