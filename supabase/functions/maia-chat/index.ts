import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!authHeader || !supabaseUrl || !supabaseAnonKey || !apiKey) {
      throw new Error('Configurações de ambiente ausentes no Supabase.')
    }

    const { message, history } = await req.json()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: authHeader } } 
    })

    // 1. Obter ID do usuário do token (seguro)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Usuário não autenticado.')

    // 2. Checar Rate Limit (5 chamadas por 1 minuto) via RPC
    const { data: canProceed, error: rpcError } = await supabase.rpc('check_ai_rate_limit', {
      user_id_param: user.id,
      limit_count: 5,
      interval_minutes: 1
    })

    if (rpcError || !canProceed) {
      return new Response(
        JSON.stringify({ error: 'Limite de mensagens atingido. Tente novamente em 1 minuto.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Chamar Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    const chat = model.startChat({ 
      history: history || [],
      generationConfig: { maxOutputTokens: 1000 }
    })
    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
