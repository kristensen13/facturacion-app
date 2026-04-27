# 🧾 Facturación App — 2bitsTechnology

Aplicación web de gestión de facturación para autónomos. Migración del Excel `PLANTILLA_FACTURAS.xlsm` a una web app moderna con Angular + Node.js.

---

## 📁 Estructura del proyecto

```
facturacion-app/
├── backend/                  ← API REST (Node.js + Express + SQLite)
│   ├── database/
│   │   ├── db.js             ← Conexión y schema SQLite
│   │   └── seed.js           ← Carga inicial de datos del Excel
│   ├── routes/
│   │   ├── clients.js        ← CRUD clientes
│   │   ├── invoices.js       ← CRUD facturas + PDF + CSV
│   │   └── catalog.js        ← CRUD catálogo de servicios
│   ├── services/
│   │   ├── pdfService.js     ← Generación de PDF (pdfkit)
│   │   └── exportService.js  ← Exportación CSV para Hacienda
│   ├── server.js             ← Servidor Express principal
│   ├── .env.example          ← Variables de entorno
│   └── package.json
│
└── frontend/                 ← SPA Angular 17
    └── src/app/
        ├── models/models.ts         ← Interfaces TypeScript
        ├── services/api.service.ts  ← Servicio HTTP centralizado
        ├── pages/
        │   ├── dashboard/           ← KPIs + gráfico + últimas facturas
        │   ├── new-invoice/         ← Formulario nueva/editar factura
        │   ├── invoice-history/     ← Archivo con filtros + cambio estado
        │   ├── clients/             ← CRUD clientes con modal
        │   └── catalog/             ← CRUD catálogo de servicios
        └── app.component.*          ← Shell con sidebar
```

---

## 🚀 Instalación y arranque local

### 1. Backend

```bash
cd backend

# Copiar variables de entorno
cp .env.example .env

# Instalar dependencias
npm install

# Crear la base de datos e importar datos del Excel
npm run seed

# Arrancar en modo desarrollo
npm run dev
# → API disponible en http://localhost:3000
# → Health check: http://localhost:3000/health
```

### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar servidor de desarrollo
npm start
# → App disponible en http://localhost:4200
```

---

## 🔌 API — Endpoints disponibles

### Empresa
| Método | Ruta           | Descripción                     |
|--------|----------------|---------------------------------|
| GET    | `/api/empresa` | Obtener datos de la empresa     |
| PUT    | `/api/empresa` | Actualizar datos de la empresa  |

### Clientes
| Método | Ruta                 | Descripción          |
|--------|----------------------|----------------------|
| GET    | `/api/clientes`      | Listar clientes      |
| GET    | `/api/clientes/:id`  | Obtener un cliente   |
| POST   | `/api/clientes`      | Crear cliente        |
| PUT    | `/api/clientes/:id`  | Actualizar cliente   |
| DELETE | `/api/clientes/:id`  | Eliminar (soft)      |

### Facturas
| Método | Ruta                         | Descripción                        |
|--------|------------------------------|------------------------------------|
| GET    | `/api/facturas`              | Listar (filtros: estado, año, etc) |
| GET    | `/api/facturas/next-numero`  | Siguiente número de factura        |
| GET    | `/api/facturas/stats`        | KPIs y estadísticas                |
| GET    | `/api/facturas/export/csv`   | Exportar CSV para Hacienda         |
| GET    | `/api/facturas/:id`          | Obtener factura completa           |
| GET    | `/api/facturas/:id/pdf`      | Generar y descargar PDF            |
| POST   | `/api/facturas`              | Crear factura                      |
| PUT    | `/api/facturas/:id`          | Actualizar factura                 |
| DELETE | `/api/facturas/:id`          | Anular factura                     |

### Catálogo
| Método | Ruta                   | Descripción           |
|--------|------------------------|-----------------------|
| GET    | `/api/catalogo`        | Listar conceptos      |
| POST   | `/api/catalogo`        | Crear concepto        |
| PUT    | `/api/catalogo/:id`    | Actualizar concepto   |
| DELETE | `/api/catalogo/:id`    | Eliminar (soft)       |

---

## ☁️ Deploy en Railway

### Backend

1. Crear nuevo proyecto en [railway.app](https://railway.app)
2. Conectar este repositorio → carpeta `backend`
3. Añadir variables de entorno:
   ```
   PORT=3000
   DB_PATH=./database/facturacion.db
   FRONTEND_URL=https://tu-app.vercel.app
   ```
4. En el primer deploy, ejecutar el seed manualmente desde Railway Shell:
   ```bash
   node database/seed.js
   ```

### Frontend

1. Crear proyecto en [Vercel](https://vercel.com) o subir el build a Railway también
2. Cambiar `environment.prod.ts`:
   ```typescript
   apiUrl: 'https://tu-api.railway.app/api'
   ```
3. Build de producción:
   ```bash
   npm run build:prod
   ```

---

## 📄 Ejemplo de creación de factura (cURL)

```bash
# Crear factura
curl -X POST http://localhost:3000/api/facturas \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "fecha": "2026-04-21",
    "estado": "Enviada",
    "lineas": [
      { "concepto": "Desplazamiento y mano de obra", "importe": 50 },
      { "concepto": "Marco + base suko", "importe": 12 }
    ]
  }'

# Descargar el PDF generado (id=1)
curl http://localhost:3000/api/facturas/1/pdf -o factura_1.pdf

# Exportar CSV para Hacienda del año 2026
curl "http://localhost:3000/api/facturas/export/csv?año=2026" -o facturas_2026.csv
```

---

## 🗄️ Schema de la base de datos

```sql
empresa         → id, nombre, nif, direccion, ciudad, cp, iban, email, telefono
clientes        → id, nombre, nif, direccion, provincia, ciudad, cp, email, telefono, iva, activo
catalogo        → id, concepto, descripcion, precio, activo
facturas        → id, numero, fecha, cliente_id, estado, notas, iva_pagado, created_at
factura_lineas  → id, factura_id, concepto, importe
```

---

## 🔧 Próximas mejoras sugeridas

- [ ] Envío de factura por email (nodemailer + SMTP)
- [ ] Login con usuario/contraseña (JWT)
- [ ] Importar facturas desde el Excel original (xlsx parser)
- [ ] Recordatorio automático de facturas pendientes de cobro
- [ ] App móvil (Angular PWA)
- [ ] Integración con WhatsApp Business API (ya tienes el agente 2bitsTechnology)

---

## 🛠️ Stack tecnológico

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | Angular 17, TypeScript, SCSS        |
| Backend    | Node.js 20, Express 4               |
| Base datos | SQLite (better-sqlite3)             |
| PDF        | pdfkit                              |
| Deploy     | Railway (backend) + Vercel (front)  |
