# 💰 FinanzasCasa — Control de Gastos Mensuales

App Angular 17 con Supabase para gestión financiera del hogar.

---

## 🚀 Setup en 5 pasos

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) → New project
2. Anota tu **Project URL** y **anon key** (en Settings → API)

### 2. Ejecutar el schema SQL
En el **SQL Editor** de Supabase, ejecuta el contenido completo de:
```
supabase/schema.sql
```
Esto crea todas las tablas, vistas e índices necesarios.

### 3. Configurar credenciales
Edita `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://XXXX.supabase.co',      // Tu URL
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' // Tu anon key
};
```
Repite en `src/environments/environment.production.ts` para producción.

### 4. Instalar dependencias
```bash
npm install
```

### 5. Iniciar la app
```bash
npm start
```
Abre [http://localhost:4200](http://localhost:4200)

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── models/models.ts         # Interfaces TypeScript
│   │   └── services/
│   │       └── supabase.service.ts  # Todas las operaciones DB
│   ├── features/
│   │   ├── dashboard/               # Vista principal con gráficas
│   │   ├── income/                  # Ingresos por miembro y mes
│   │   ├── expenses/                # Gastos categorizados
│   │   ├── members/                 # Gestión de miembros del hogar
│   │   └── reports/                 # Reportes anuales + exportación
│   ├── app.component.ts             # Layout con sidebar
│   ├── app.routes.ts                # Rutas lazy-loaded
│   └── app.config.ts
├── environments/
│   ├── environment.ts               # ← Poner tus credenciales aquí
│   └── environment.production.ts
└── styles.scss                      # Estilos globales (tema oscuro)
supabase/
└── schema.sql                       # Script de base de datos
```

---

## ✨ Funcionalidades

| Módulo      | Funciones |
|-------------|-----------|
| **Dashboard**  | KPIs del mes, gráfica tendencia 6 meses, desglose categorías, alertas automáticas |
| **Ingresos**   | CRUD ingresos, asignar por miembro, navegar por mes |
| **Gastos**     | CRUD gastos, categorías, duración en meses, fijo/variable, filtros |
| **Miembros**   | CRUD miembros del hogar, avatar con color personalizado |
| **Reportes**   | Proyección anual, análisis categorías, exportar **Excel** y **PDF** |

---

## 🗄️ Tablas en Supabase

| Tabla        | Descripción |
|--------------|-------------|
| `members`    | Personas del hogar |
| `income`     | Ingresos proyectados por mes y miembro |
| `expenses`   | Gastos con categoría, duración y tipo |
| `categories` | Rubros (pre-cargados: 15 categorías) |

### Vistas (auto-generadas)
- `expenses_detail` — gastos enriquecidos con nombre de categoría y miembro
- `income_detail` — ingresos con nombre de miembro

---

## 📦 Dependencias principales

- **@angular/core** `^17.3`
- **@supabase/supabase-js** `^2.39`
- **chart.js** `^4.4`
- **xlsx** `^0.18` — exportación Excel
- **jspdf** + **jspdf-autotable** — exportación PDF

---

## 🎨 Diseño

- Tema **oscuro fintech** con acentos en esmeralda
- Tipografía: **Syne** (display) + **Instrument Sans** (body) + **DM Mono** (números)
- Totalmente responsivo (sidebar colapsable en móvil)

---

## 🔐 Seguridad (opcional)

El schema incluye comentarios para habilitar **Row Level Security (RLS)** de Supabase si quieres agregar autenticación por usuario. Descomenta las líneas al final de `schema.sql`.

---

## 💡 Categorías incluidas

💳 Crédito · 📱 Suscripciones · 🛒 Supermercado · 📞 Telefonía · 🌐 Internet · 🐾 Mascotas · 🚗 Transporte · 📚 Educación · 🏥 Salud · 🎬 Entretenimiento · 🏠 Servicios · 🍽️ Restaurantes · 👗 Ropa · ✈️ Viajes · 📦 Otros
