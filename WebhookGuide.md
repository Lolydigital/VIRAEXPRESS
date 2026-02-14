# Guia de Automação de Vendas (Webhook)

Tamara, o sistema que montamos no Admin (/admin) já é o "braço manual" que você pediu. Para a **automação total** (comprou -> liberou, reembolsou -> bloqueou), você deve usar uma **Supabase Edge Function**.

## Como funciona o Fluxo
1. O cliente compra na Kiwify/Hotmart.
2. A plataforma envia um **Webhook (POST)** para o Supabase.
3. O Supabase recebe e atualiza a tabela `profiles` instantaneamente.

---

## Código da Função (Supabase Edge Function)

Você pode criar uma function chamada `handle-payment` e colar este código:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload = await req.json()
    // Exemplo Kiwify: payload.status, payload.customer.email, payload.product_name
    const email = payload.customer?.email?.toLowerCase()
    const status = payload.status // 'paid', 'refunded', 'charged_back'
    
    // 1. Identificar o Plano (Mapeie seus nomes de produto aqui)
    let planName = 'Basic'
    if (payload.product_name?.includes('Elite') || payload.product_name?.includes('Profissional')) {
      planName = 'Professional'
    }

    // 2. Buscar cotas na tabela plan_config que criamos
    const { data: config } = await supabase
      .from('plan_config')
      .select('image_quota')
      .eq('plan_name', planName)
      .single()

    const credits = config?.image_quota || 30

    if (status === 'paid' || status === 'completed') {
      // ATIVAR OU CRIAR USUÁRIO
      await supabase.from('profiles').upsert([{
        email,
        plan: planName,
        status: 'active',
        image_credits_total: credits,
        credits_total: planName === 'Professional' ? 9999 : 50
      }], { onConflict: 'email' })
    } 
    else if (status === 'refunded' || status === 'charged_back') {
      // BLOQUEAR ACESSO
      await supabase.from('profiles')
        .update({ status: 'inactive' })
        .eq('email', email)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }
})
```

## Passo a Passo na Plataforma (Kiwify/Hotmart)
1. Vá em **Webhooks** na sua plataforma de vendas.
2. Crie um novo Webhook para os eventos: `Venda Aprovada`, `Reembolso`, `Chargeback`.
3. Na URL, cole a URL da sua Supabase Function (ex: `https://xyz.supabase.co/functions/v1/handle-payment`).
4. Selecione o método `POST`.

---

## O modo Híbrido (O que fizemos no código)
- **Automático**: O script acima cuida de tudo 24h por dia.
- **Manual**: Se um cliente reclamar ou o webhook falhar, você entra no seu painel `/admin` do ViraExpress e clica em **"NOVO ALUNO"** ou altera o plano dele manualmente. O código que escrevi já salva direto no banco, então o usuário verá a mudança na hora!

Faz sentido esse fluxo pra você? Se quiser, posso ajustar os nomes dos planos no script para baterem exatamente com os seus produtos!
