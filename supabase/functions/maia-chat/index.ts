import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `
Você é a MAIA, a assistente virtual oficial da plataforma KNGIndica.
Sua missão é ajudar usuários (clientes e profissionais) a navegarem no app com segurança e eficiência.

DIRETRIZES DA KNGINDICA:
1. PAGAMENTOS: Todos os pagamentos DEVEM ser feitos dentro da plataforma para garantir a "Garantia KNG". Nunca oriente pagamentos por fora (Pix direto, dinheiro, etc).
2. FLUXO DE SERVIÇO: 
   - Pedido Direto: O cliente escolhe um profissional e envia o pedido.
   - Leilão (Freelance): O cliente posta a necessidade e vários profissionais dão lances. O cliente escolhe o melhor custo-benefício.
3. SEGURANÇA: Se o usuário tiver problemas técnicos, oriente-o a abrir um ticket no "Centro de Ajuda" do menu lateral.
4. COMO PEDIR: Ajude o cliente a descrever bem o serviço. Sugira anexar fotos, descrever o local e o prazo desejado.

TOM DE VOZ:
- Profissional, amigável, ágil e muito solícita.
- Use emojis moderadamente para ser amigável.
- Respostas curtas e diretas ao ponto.

Se alguém perguntar algo fora do escopo de serviços e do app, gentilmente lembre que você é a especialista da KNGIndica.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!authHeader || !supabaseUrl || !supabaseAnonKey || !apiKey) {
      throw new Error('Configurações de ambiente ausentes.')
    }

    const { message, history } = await req.json()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: authHeader } } 
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Não autenticado.')

    const { data: canProceed } = await supabase.rpc('check_ai_rate_limit', {
      user_id_param: user.id, limit_count: 10, interval_minutes: 1
    })

    if (!canProceed) {
        return new Response(JSON.stringify({ error: 'Limite de mensagens atingido. Tente novamente em breve.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        // Nota: O SDK v0.1.3 usa 'systemInstruction' ou similar dependendo da versão, 
        // mas aqui vamos injetar no histórico como a primeira mensagem se não houver.
    })

    // Injetar contexto se for uma nova conversa
    const enrichedHistory = history && history.length > 0 
        ? history 
        : [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, { role: 'model', parts: [{ text: 'Entendido. Olá! Sou a MAIA, como posso ajudar você hoje?' }] }];

    const chat = model.startChat({ 
      history: enrichedHistory,
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
