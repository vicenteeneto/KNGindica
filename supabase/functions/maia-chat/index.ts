import { GoogleGenAI } from "https://esm.sh/@google/genai@1.29.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `
Você é a MAIA, a assistente virtual oficial da plataforma KNGindica.
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

Se alguém perguntar algo fora do escopo de serviços e do app, gentilmente lembre que você é a especialista da KNGindica.
`;

interface ChatTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * O Gemini exige que o histórico comece com um turno 'user'. O cliente semeia a
 * conversa com uma saudação da MAIA ('model'), então descartamos os turnos de
 * modelo iniciais antes de enviar. Também filtra turnos malformados.
 */
const sanitizeHistory = (history: unknown): ChatTurn[] => {
  if (!Array.isArray(history)) return [];
  const valid = history.filter(
    (t): t is ChatTurn =>
      !!t &&
      (t.role === "user" || t.role === "model") &&
      Array.isArray(t.parts) &&
      t.parts.length > 0 &&
      typeof t.parts[0]?.text === "string"
  );
  const firstUser = valid.findIndex((t) => t.role === "user");
  return firstUser === -1 ? [] : valid.slice(firstUser);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
      console.error("Variáveis de ambiente ausentes na Edge Function maia-chat.");
      return json({ error: "Serviço indisponível no momento." }, 503);
    }
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const { message, history } = await req.json();
    if (typeof message !== "string" || !message.trim()) {
      return json({ error: "Mensagem vazia." }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Não autenticado." }, 401);

    const { data: canProceed } = await supabase.rpc("check_ai_rate_limit", {
      user_id_param: user.id,
      limit_count: 10,
      interval_minutes: 1,
    });

    if (!canProceed) {
      return json({ error: "Limite de mensagens atingido. Tente novamente em breve." }, 429);
    }

    // O prompt de sistema vai em systemInstruction — não mais injetado como primeira
    // mensagem do histórico, que gastava tokens e podia ser sobrescrito pelo usuário.
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: MODEL,
      history: sanitizeHistory(history),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage({ message });
    const text = result.text ?? "";

    return json({ text });
  } catch (error) {
    console.error("Erro na maia-chat:", error);
    return json({ error: "Não consegui processar sua mensagem agora." }, 500);
  }
});
