import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { income, categories, members_count, current_expenses } = await req.json();

    if (!income || income <= 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un ingreso mayor a 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new Anthropic();

    const categoriesText = (categories as any[])
      .map((c: any) => `- ${c.icon || ''} ${c.name}`)
      .join('\n');

    const expensesText = current_expenses?.length
      ? (current_expenses as any[])
          .map((e: any) => `- ${e.category_name || 'Sin categoría'}: $${Number(e.amount).toLocaleString('es-MX')} MXN`)
          .join('\n')
      : 'No hay gastos registrados para este período.';

    const numMembers = members_count || 1;
    const perPersonIncome = income / numMembers;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: `Eres un asesor financiero experto en finanzas personales y del hogar para familias mexicanas de clase media. Tu misión es generar un presupuesto mensual realista, equilibrado y orientado al bienestar financiero.

## Datos del hogar
- **Ingreso mensual total:** $${income.toLocaleString('es-MX')} MXN
- **Número de personas:** ${numMembers}
- **Ingreso por persona:** $${perPersonIncome.toLocaleString('es-MX')} MXN

## Categorías de gasto disponibles en la app
${categoriesText}

## Gastos actuales registrados este mes
${expensesText}

## Instrucciones
Genera un presupuesto mensual óptimo usando estas reglas:
1. Aplica la regla 50/30/20 adaptada al contexto mexicano (incluye IMSS, SAR, fondos de emergencia)
2. Considera costos de vida en México (servicios básicos, transporte, alimentación)
3. Contempla el aguinaldo y PTU como ingreso anual extra para metas de ahorro
4. Si hay gastos registrados que exceden el presupuesto sugerido, señálalo como alerta
5. SOLO incluye en "categorias" las que aparecen exactamente en la lista de categorías disponibles
6. El porcentaje de todas las categorías más el ahorro NO debe superar el 100% del ingreso
7. El monto de ahorro sugerido debe ser al menos el 10% del ingreso (ideal 20%)

Responde ÚNICAMENTE con un JSON válido, sin texto extra, con esta estructura exacta:
{
  "resumen": "2-3 oraciones describiendo la estrategia financiera recomendada para este hogar",
  "salud_financiera": "buena|regular|critica",
  "tasa_ahorro_sugerida": 20,
  "monto_ahorro": 5000,
  "categorias": [
    {
      "nombre": "Nombre exacto de la categoría como aparece en la lista",
      "porcentaje": 25,
      "monto": 6250,
      "razon": "Explicación breve (1 oración) de por qué este monto es apropiado"
    }
  ],
  "recomendaciones": [
    "Recomendación financiera práctica 1",
    "Recomendación financiera práctica 2",
    "Recomendación financiera práctica 3"
  ],
  "alertas": [
    "Alerta o riesgo financiero específico (solo si existe un problema concreto)"
  ]
}`,
        },
      ],
    });

    // Extract text from response (skip thinking blocks)
    let responseText = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        responseText = block.text;
        break;
      }
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('La respuesta de IA no contiene JSON válido');
    }

    const suggestion = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en generate-budget:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
