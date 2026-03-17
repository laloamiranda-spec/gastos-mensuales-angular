# Arquitectura propuesta de FinanzasCasa

## 1. Objetivo

Diseñar una arquitectura clara, escalable y amigable para una familia o usuario no tecnico, donde sea facil entender:

- cuanto dinero entro
- cuanto dinero salio
- que pagos vienen
- con que medio se pagaron
- cuanto queda disponible

La idea central es separar tres conceptos:

1. planeacion
2. dinero real
3. instrumentos de pago

## 2. Principios del rediseño

### 2.1 Experiencia simple para el usuario

El usuario no debe pensar en terminos contables complejos. Debe ver nombres cercanos a la vida diaria:

- Inicio
- Entradas
- Pagos y gastos
- Tu dinero
- Plan mensual
- Personas
- Tarjetas y medios de pago
- Resumenes

### 2.2 Separacion correcta del dominio

No todo es lo mismo:

- una cuenta con saldo no es igual a una tarjeta de credito
- un gasto recurrente no es igual a un movimiento real
- pagar con tarjeta no es lo mismo que liquidar la tarjeta

### 2.3 Datos finitos y utiles

No se deben generar registros infinitos. Las ocurrencias recurrentes se materializan solo en una ventana operativa controlada.

## 3. Nuevo mapa de modulos

| Nombre actual | Nombre propuesto | Objetivo para el usuario |
| --- | --- | --- |
| Dashboard | Inicio | Ver lo mas importante de su dinero en un vistazo |
| Ingresos | Entradas de dinero | Registrar y consultar el dinero que llega |
| Gastos | Pagos y gastos | Ver lo que debe pagar y registrar pagos |
| Bancos | Tu dinero | Administrar cuentas, saldos y movimientos reales |
| Presupuesto | Plan mensual | Organizar cuanto puede gastar por rubro |
| Miembros | Personas | Ver quienes participan en el hogar |
| Formas de pago | Tarjetas y medios de pago | Administrar tarjetas, efectivo, transferencias y vales |
| Reportes | Resumenes | Consultar tendencias, pendientes y vista anual |

## 4. Arquitectura funcional

### 4.1 Cuentas

Representan dinero real o saldo disponible.

Ejemplos:

- cuenta de debito
- efectivo o caja
- ahorro
- inversion
- cuenta de vales con saldo

### 4.2 Tarjetas y medios de pago

Representan con que instrumento se paga.

Ejemplos:

- tarjeta de credito
- tarjeta de debito ligada a una cuenta
- tarjeta de vales ligada a una cuenta o monedero
- efectivo ligado a una caja
- transferencia ligada a una cuenta origen

### 4.3 Pagos y gastos planeados

Representan obligaciones o cargos que deberian suceder.

Ejemplos:

- renta mensual
- limpieza semanal todos los miercoles
- suscripcion mensual
- gasto por semanas limitado a cierto numero de meses

### 4.4 Ocurrencias

Son los eventos reales del calendario.

Ejemplo de un gasto semanal de limpieza:

- miercoles 04 marzo 2026 -> 600
- miercoles 11 marzo 2026 -> 600
- miercoles 18 marzo 2026 -> 600
- miercoles 25 marzo 2026 -> 600

### 4.5 Movimientos reales

Son entradas y salidas de dinero ya efectuadas en una cuenta.

Ejemplos:

- deposito de nomina
- pago en efectivo
- transferencia a proveedor
- retiro
- liquidacion de tarjeta

## 5. Flujo operativo recomendado

### 5.1 Entrada de dinero

1. El usuario registra una entrada.
2. Selecciona persona, monto, descripcion y cuenta destino.
3. El sistema crea el ingreso.
4. El sistema crea un movimiento bancario de tipo ingreso.
5. El saldo de la cuenta se actualiza.

### 5.2 Gasto recurrente semanal

1. El usuario registra una plantilla:
   - 600 por ocurrencia
   - cada miercoles
   - inicio marzo 2026
   - indefinido
2. El sistema genera ocurrencias solo para una ventana util.
3. Cada ocurrencia aparece con fecha real en el mes.
4. El usuario puede pagar una ocurrencia especifica.

### 5.3 Pago con debito, efectivo o vales

1. Se marca la ocurrencia como pagada.
2. Se crea un movimiento real de salida.
3. Se descuenta saldo de la cuenta correspondiente.

### 5.4 Pago con tarjeta de credito

1. Se marca la ocurrencia como pagada.
2. Se registra que el gasto se cubrio con tarjeta.
3. No disminuye la caja de inmediato.
4. Pasa al modulo de pagos pendientes de tarjeta.
5. Cuando se liquida la tarjeta, ahi si sale dinero de la cuenta real.

## 6. Modelo de datos recomendado

### 6.1 Tablas principales

- `accounts`
- `payment_instruments`
- `expense_templates`
- `expense_occurrences`
- `income`
- `bank_movements`
- `credit_card_settlements` en una fase posterior

### 6.2 Entidades y responsabilidades

| Entidad | Rol |
| --- | --- |
| `accounts` | Saldo real disponible |
| `payment_instruments` | Medio con el que se paga |
| `expense_templates` | Regla del gasto recurrente |
| `expense_occurrences` | Cargos concretos por fecha |
| `income` | Entradas registradas |
| `bank_movements` | Libro de entradas y salidas reales |

## 7. Servicios de dominio recomendados

### 7.1 AccountService

Administra:

- saldos
- movimientos
- cuentas visibles al usuario

### 7.2 PaymentInstrumentService

Administra:

- tarjetas
- efectivo
- transferencias
- vales
- relacion entre instrumento y cuenta

### 7.3 RecurringObligationService

Administra:

- generacion de ocurrencias
- ventana operativa de meses
- sincronizacion cuando se edita una plantilla

### 7.4 SettlementService

Administra:

- pagos pendientes por tarjeta
- agrupacion por fecha de corte
- liquidaciones

## 8. Reglas clave de negocio

### 8.1 No generar infinito

Las ocurrencias se generan solo para:

- mes anterior
- mes actual
- algunos meses futuros

Esto evita crecimiento sin control de la base.

### 8.2 No mezclar cuenta con instrumento

- una cuenta tiene saldo
- un instrumento se usa para pagar
- una tarjeta de credito genera deuda

### 8.3 Separar planeado y real

- planeado: lo que deberia pasar
- real: lo que ya paso

## 9. Experiencia ideal para el usuario

### Inicio

Debe mostrar:

- cuanto entro
- cuanto salio
- cuanto queda
- cuantos dias faltan para terminar el mes
- cuanto puede gastar todavia
- proximos pagos

### Entradas de dinero

Debe permitir:

- registrar ingresos
- elegir la cuenta donde cayeron
- ver el reflejo en Tu dinero

### Pagos y gastos

Debe permitir:

- registrar gastos mensuales o semanales
- ver ocurrencias por fecha
- pagar por ocurrencia

### Tu dinero

Debe mostrar:

- cuentas
- saldo
- movimientos reales
- entradas y salidas del mes

### Plan mensual

Debe ayudar a decidir:

- cuanto usar por rubro
- cuanto guardar
- quien esta gastando mas

### Tarjetas y medios de pago

Debe mostrar:

- tarjetas de credito
- debito
- vales
- efectivo
- transferencias

### Resumenes

Debe responder:

- que toca pagar este mes
- cuanto debo a una tarjeta
- como voy por categoria
- como voy por mes

## 10. Estrategia de migracion

### Fase 1

- renombrar modulos visibles
- mantener compatibilidad
- mejorar textos y navegacion

### Fase 2

- terminar de centralizar cuentas y movimientos reales
- reflejar ingresos automaticamente en cuentas
- consolidar vales como saldo o instrumento segun el caso

### Fase 3

- implementar liquidaciones de tarjeta por ciclo
- mover mas reportes a lectura basada en ocurrencias y movimientos

## 11. Conclusion

La arquitectura ideal para FinanzasCasa debe organizarse alrededor de una idea sencilla:

- lo que planeas
- lo que paso realmente
- con que lo pagaste
- cuanto te queda

Con este enfoque, la plataforma es mas clara para el usuario comun, mas robusta para escenarios semanales y mas escalable para evolucionar hacia una experiencia cercana a banca personal familiar.
