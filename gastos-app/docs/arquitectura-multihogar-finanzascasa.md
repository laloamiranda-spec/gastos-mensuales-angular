# Arquitectura multihogar de FinanzasCasa

## Vision

FinanzasCasa debe evolucionar de una app local de control de gastos a una plataforma centrada en hogares. El hogar es el espacio donde se comparte informacion, dinero, responsabilidades y reglas. Un usuario puede participar en varios hogares sin mezclar datos, roles ni decisiones.

## Objetivo de negocio

- Permitir que una persona cree su hogar y administre a quienes participan.
- Compartir gastos por porcentaje entre integrantes.
- Preparar liquidaciones internas cuando una persona paga de mas por otra.
- Separar administracion del hogar y administracion de la plataforma.
- Abrir la puerta a planes gratuitos y de pago sin rehacer la base del sistema.

## Principios de arquitectura

- El eje del negocio es el hogar, no el usuario individual.
- Un usuario puede pertenecer a varios hogares al mismo tiempo.
- Los datos compartidos deben colgar de `household_id`.
- La seguridad debe vivir en membresias y `RLS`, no solo en la interfaz.
- El reparto de gastos debe modelarse con reglas y ocurrencias, no con calculo temporal.
- La administracion de plataforma debe estar separada de la administracion del hogar.

## Experiencia de usuario propuesta

### Para una persona normal del hogar

- `Inicio`: panorama del mes
- `Pagos y gastos`: gastos planeados y pagos realizados
- `Tu dinero`: cuentas, movimientos y tarjetas
- `Plan mensual`: presupuesto y disponible
- `Personas`: integrantes visibles del hogar
- `Hogar y accesos`: quien participa y con que permiso
- `Gastos compartidos`: como se reparte cada gasto
- `Resumenes`: reportes y obligaciones

### Para administracion de plataforma

- `Administracion`: usuarios, planes, suscripciones y activacion del sistema

## Capas de dominio

### Identidad

- `profiles`
- futuro enlace con `auth.users`
- activacion de cuenta
- privilegios de plataforma

### Hogares y permisos

- `households`
- `household_memberships`
- `household_invites`

### Dinero real

- `bank_accounts`
- `bank_movements`
- `payment_methods`

### Obligaciones y reparto

- `expenses`
- `expense_occurrences`
- `expense_split_rules`
- `expense_occurrence_allocations`
- futuro `member_settlements`

### Plataforma

- `subscription_plans`
- `household_subscriptions`
- futuro `platform_audit_logs`

## Roles recomendados por hogar

- `owner`: dueno del hogar, invitaciones, plan y administracion total
- `admin`: administra cuentas, gastos, integrantes y configuraciones del hogar
- `editor`: registra movimientos, gastos y pagos
- `viewer`: solo consulta
- `limited`: acceso parcial para una fase posterior

## Casos de uso clave

### 1. Crear hogar

1. Una persona crea un hogar.
2. Se registra `household`.
3. Se vincula como `owner` en `household_memberships`.
4. Se inicializa una suscripcion `free` o `trial`.

### 2. Invitar integrante

1. Owner o admin captura email y rol.
2. Se crea `household_invite`.
3. El invitado acepta.
4. Se crea `household_membership`.

### 3. Repartir gasto por porcentaje

1. Se registra una plantilla de gasto o un gasto manual.
2. Se guardan reglas base en `expense_split_rules`.
3. Cada ocurrencia genera filas en `expense_occurrence_allocations`.
4. Cada allocation conoce porcentaje, monto y estatus de liquidacion.

### 4. Pagar por separado

Hay que separar dos conceptos:

- responsabilidad del gasto
- liquidacion interna entre personas

No siempre quien paga absorbe el 100 por ciento del gasto. Por eso las liquidaciones internas deben modelarse aparte y no mezclarse con el movimiento bancario original.

## Entidades nuevas

### `profiles`

- `id`
- `email`
- `full_name`
- `avatar_color`
- `is_active`
- `is_platform_admin`

### `households`

- `id`
- `name`
- `slug`
- `owner_user_id`
- `is_active`

### `household_memberships`

- `id`
- `household_id`
- `user_id`
- `role`
- `is_active`

### `household_invites`

- `id`
- `household_id`
- `email`
- `role`
- `status`
- `token`
- `expires_at`

### `subscription_plans`

- `id`
- `code`
- `name`
- `description`
- `price_monthly`
- `max_members`

### `household_subscriptions`

- `id`
- `household_id`
- `plan_id`
- `status`
- `starts_at`
- `ends_at`

### `expense_split_rules`

- `id`
- `expense_id`
- `member_id` opcional para compatibilidad con el modelo actual
- `user_id` opcional para la siguiente fase multiusuario
- `percentage`

### `expense_occurrence_allocations`

- `id`
- `expense_occurrence_id`
- `member_id` opcional
- `user_id` opcional
- `percentage`
- `amount`
- `settlement_account_id`
- `is_settled`
- `settled_at`

## Seguridad recomendada

Todas las tablas del negocio compartido deben aislarse por `household_id`.

Un usuario puede:

- leer si tiene membership activa en ese hogar
- editar segun rol
- administrar invitaciones y plan solo si es `owner` o `admin`

Las tablas de plataforma se separan para que solo las vea un `platform admin`.

## Modulos implementados en esta fase

- `Hogar y accesos`
  - lista hogares, membresias e invitaciones
  - permite crear hogar e invitar
- `Gastos compartidos`
  - deja visible la capa de reparto por porcentaje
  - muestra que gastos ya tienen reglas y cuales faltan
- `Administracion`
  - muestra perfiles, planes y suscripciones
  - deja lista la base para activacion, desactivacion y monetizacion

## Estrategia de migracion

### Fase 1

- crear tablas multi-hogar
- crear planes y suscripciones
- crear reglas base de reparto
- agregar modulos visibles de UI y servicios iniciales

### Fase 2

- agregar `household_id` a entidades financieras
- poblar un hogar por defecto para datos existentes
- empezar a filtrar informacion por hogar

### Fase 3

- integrar Supabase Auth
- convertir invitaciones en flujo real por email
- activar `RLS`

### Fase 4

- modelar `member_settlements`
- permitir pagos internos entre integrantes
- habilitar cobro por plan y auditoria de plataforma

## Fase entregada en este cambio

En esta primera fase se entrega:

- diseno tecnico documentado
- SQL base para hogares, membresias, invitaciones, planes, suscripciones y reparto de gastos
- modulos visibles de:
  - `Hogar y accesos`
  - `Gastos compartidos`
  - `Administracion`
- modelos y servicios iniciales en Angular para soportar la evolucion
- rutas y menu principal alineados con la nueva arquitectura

## Siguiente paso recomendado

El siguiente paso correcto es agregar `household_id` a las tablas financieras actuales y crear una migracion que asigne todo el historico existente al primer hogar operativo. A partir de ahi ya se puede encender seguridad por hogar y comenzar a repartir gastos con verdadero aislamiento multi-hogar.
