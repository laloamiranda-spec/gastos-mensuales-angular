# Propuesta de rediseño UX/UI para FinanzasCasa

## Objetivo

Redisenar FinanzasCasa para que se sienta como una plataforma moderna de finanzas del hogar: clara, accionable, colaborativa y centrada en decisiones diarias. La experiencia debe ayudar a responder en segundos:

- cuanto dinero tengo disponible hoy
- cuanto debo apartar para tarjetas
- que pagos vienen en los siguientes dias
- cuanto me queda realmente para gastar
- con que hogar estoy trabajando

## Referencias de producto

La propuesta toma patrones de plataformas bien resueltas de finanzas personales:

- Monarch Money: experiencia compartida por hogar, dashboard configurable, enfoque en recurring y collaboration
- Copilot Money: home centrado en "free to spend", alertas y jerarquia clara
- Rocket Money: manejo visual de recurrentes, facturas y pagos futuros
- YNAB: claridad presupuestaria y lenguaje simple para decisiones del dia a dia

## Principios de experiencia

1. Menos modulos, mas claridad.
2. El hogar siempre visible como contexto activo.
3. Separar dinero real, pagos futuros y deuda de tarjeta.
4. Mostrar prioridades antes que tablas.
5. Disenar primero para decisiones, despues para captura.
6. Evitar look de panel administrativo.

## Nueva arquitectura de navegacion

### Primer nivel

- Inicio
- Dinero
- Pagos
- Plan
- Hogar
- Resumenes
- Ajustes

### Objetivo de cada espacio

| Espacio | Para que sirve |
| --- | --- |
| Inicio | Ver lo importante hoy |
| Dinero | Cuentas, movimientos, transferencias y efectivo |
| Pagos | Obligaciones, tarjetas, calendario y recurrentes |
| Plan | Presupuesto, limites y metas |
| Hogar | Miembros, accesos, invitaciones y reparto |
| Resumenes | Analisis y exportaciones |
| Ajustes | Seguridad, perfil y configuracion |

## Propuesta visual

### Direccion estetica

- Base clara y luminosa
- Jerarquia fuerte en titulos, datos grandes y estados
- Menos bordes verdes en exceso
- Tarjetas limpias con mas aire y menos ruido
- Colores semanticos:
  - verde: saludable
  - ambar: atencion
  - rojo coral: riesgo
  - azul petroleo: informativo

### Tipografia y sistema visual

- Titulo display solo para encabezados principales
- Fuente UI mas sobria para tablas, formularios y data
- Radio amplio pero consistente
- Sombras suaves y poco profundas
- Iconografia simple y no tecnica

## Pantallas clave

### 1. Inicio

El home debe convertirse en el centro de control del hogar.

#### Bloques recomendados

- Disponible hoy
- Apartado para tarjetas
- Pagos proximos
- Restante para gastar
- Calendario de los siguientes 15 dias
- Alertas del hogar
- Actividad reciente

#### Comportamiento esperado

- Si falta dinero para cubrir una tarjeta, mostrarlo como alerta principal
- Si hay pagos en los proximos 7 dias, destacarlos por encima del resto
- Si el usuario no tiene hogar, llevarlo a crear o aceptar invitacion

### 2. Dinero

Unificar aqui:

- cuentas
- movimientos
- entradas de dinero
- transferencias
- efectivo

#### Subvistas

- Resumen
- Movimientos
- Cuentas
- Transferencias

### 3. Pagos

Esta pantalla debe volverse uno de los diferenciales del producto.

#### Subvistas

- Por pagar
- Tarjetas
- Recurrentes
- Calendario

#### Valor principal

- mostrar cuanto apartar para cada tarjeta
- ver fecha de corte y pago
- listar compras y obligaciones del ciclo
- convertir gastos semanales en fechas reales del calendario

### 4. Hogar

Debe ser la pantalla de colaboracion.

#### Subvistas

- Miembros
- Accesos
- Invitaciones
- Reparto de gastos

#### Regla UX

Separar visualmente:

- miembro del hogar
- usuario con acceso

No deben verse como el mismo concepto.

## Mock de pantallas

### Inicio

- Sidebar sobria
- Topbar con selector de hogar y acciones rapidas
- Fila superior de KPIs
- Bloque de pagos proximos a la izquierda
- Bloque de tarjetas por liquidar a la derecha
- Actividad reciente abajo

### Pagos

- Encabezado con filtros por mes, hogar y tarjeta
- Tarjetas de resumen:
  - total por pagar
  - total de tarjetas
  - total recurrente
  - apartado recomendado
- Vista de calendario y vista lista

### Hogar

- Hero con nombre del hogar, plan y numero de miembros
- Bloque de miembros reales
- Bloque de usuarios con acceso
- Centro de invitaciones
- Reparto de gastos y saldos internos

## Mejoras especificas de UX

### Navegacion

- Reducir etiquetas tecnicas como "Bank" o "Out"
- Usar nombres cotidianos
- Dejar Administracion totalmente fuera para usuarios normales

### Tablas

- Convertir tablas criticas en listas enriquecidas o cards en movil
- Dejar tablas solo para contextos de analisis o administracion

### Formularios

- Dividir formularios largos en bloques visuales
- Mostrar resumen lateral o inferior mientras se captura
- Confirmar impacto: "esto bajara saldo de BBVA", "esto suma deuda en AMEX"

### Mobile

- Bottom navigation para Inicio, Dinero, Pagos, Plan y Hogar
- Tablas convertidas a cards
- Acciones principales al alcance del pulgar

## Roadmap recomendado

### Fase 1

- Redisenar shell global
- Nueva navegacion
- Nuevo selector de hogar

### Fase 2

- Nuevo Inicio
- Nuevo modulo Pagos
- Nueva pantalla de Tarjetas

### Fase 3

- Rediseno de Hogar
- Rediseno de Dinero
- Mejor experiencia movil

### Fase 4

- Sistema de componentes reutilizables
- Personalizacion por plan
- Alertas y automatizaciones visuales

## Entregables recomendados posteriores

- Sistema visual base
- Biblioteca de componentes
- Wireframes de alta fidelidad
- Prototipo clickable
- Guia de contenido y microcopy

## Conclusion

La mejor siguiente version de FinanzasCasa no es solo mas bonita; debe ser mas comprensible, mas enfocada en decisiones y mucho mas clara para hogares compartidos. El rediseno propuesto reduce friccion, mejora la lectura del dinero real y hace mas visible aquello que hoy mas importa: cuanto tienes, cuanto debes apartar y que pagos siguen.
