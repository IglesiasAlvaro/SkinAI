# SkinAI — Frontend Web (Prototipo Académico)

Aplicación web moderna, accesible y adaptable para la clasificación experimental de imágenes dermatológicas mediante el modelo de visión por computador **SkinAI v2** (basado en la arquitectura *EfficientNetB0* y entrenado con el conjunto público de datos *HAM10000*), complementada con un asistente conversacional de orientación médica fundamentado en **RAG (Gemini + Supabase pgvector)**.

---

## 🌐 Arquitectura de Servicios y URLs

El sistema utiliza una arquitectura desacoplada en dos servicios backend independientes:

### 1. Servicio de Predicción e Inferencia (`POST /predict`)
* **Producción (Render):** `https://skinai-backend-ena4.onrender.com`
* **Desarrollo Local:** `http://127.0.0.1:8000`
* **Rutas:** `GET /health` (estado del modelo) y `POST /predict` (`multipart/form-data` con campo `file`).

### 2. Servicio de Chatbot RAG (`POST /chat`)
* **Producción (Render):** `https://skinai-backend-chat.onrender.com`
* **Desarrollo Local:** `http://127.0.0.1:8001`
* **Rutas:** `GET /health` (estado del servicio) y `POST /chat` (`application/json` con campo `question`).

### 3. Frontend Web (Cliente)
* **Producción (GitHub Pages):** [https://iglesiasalvaro.github.io/SkinAI/](https://iglesiasalvaro.github.io/SkinAI/)
* **Origen CORS:** `https://iglesiasalvaro.github.io`

> [!NOTE]
> **Arranque en frío en Render (Free Tier):**
> Los servicios gratuitos de Render entran en suspensión tras inactividad y pueden demorar entre 1 y 2 minutos en responder la primera vez. El frontend implementa:
> 1. **Wakeup Silencioso:** Al cargar la página, se realiza un `GET /health` a ambas URLs en segundo plano para iniciar el encendido de los servidores sin mostrar errores al usuario.
> 2. **Aviso de 8 Segundos:** Si una respuesta tarda más de 8 segundos, la interfaz informa amistosamente: *"El servidor está despertando, esto puede tardar hasta un minuto..."*.
> 3. **Timeouts Extendidos:** Se mantiene un límite de 95 segundos (>= 90s) para asegurar que las peticiones no aborten prematuramente durante el arranque en frío.

---

## 🎯 Objetivo del Proyecto

Proporcionar una interfaz gráfica intuitiva, profesional y rigurosa para estudiantes e investigadores de Ingeniería de Sistemas y ciencias de la salud. Permite seleccionar una imagen dermatoscópica, previsualizarla con validación local (< 10 MB) y enviarla al backend de inferencia para recibir y visualizar las puntuaciones Softmax de las siete clases cutáneas estudiadas, además de consultar dudas informativas mediante un asistente virtual RAG.

---

## 📁 Estructura del Proyecto

```text
SkinAI/
├── index.html              # Estructura semántica HTML5, accesible y responsive (Analizador + Chatbot)
├── css/
│   └── styles.css          # Sistema de diseño: variables CSS, paleta salud/tech, widget flotante de chat
├── js/
│   ├── config.js           # Configuración centralizada: PREDICT_API_URL, CHAT_API_URL, toggle local/prod
│   ├── api.js              # Capa de comunicación HTTP: predictImage, sendChatMessage, wakeupServers
│   └── app.js              # Controlador UI/UX: dropzone, inferencia, asistente RAG, modal de conexión
├── assets/
│   └── favicon.svg         # Favicon vectorial con motivo dermatológico y de IA
└── README.md               # Guía completa de arquitectura, ejecución y conexión con los backends
```

---

## 🔬 Las 7 Clases Dermatológicas Evaluadas

El modelo fue entrenado con las 7 categorías diagnósticas de HAM10000:

1. **`akiec`**: Queratosis actínica / Carcinoma intraepitelial (Bowen).
2. **`bcc`**: Carcinoma basocelular.
3. **`bkl`**: Lesiones queratósicas benignas (queratosis seborreica, léntigo).
4. **`df`**: Dermatofibroma (histiocitoma fibroso benigno).
5. **`mel`**: Melanoma (neoplasia melanocítica invasiva o in situ).
6. **`nv`**: Nevo melanocítico (lunar benigno común).
7. **`vasc`**: Lesiones vasculares (angiomas, granulomas piógenos).

> **Aviso de interpretación:** Las puntuaciones mostradas corresponden a la salida Softmax del modelo y representan correlaciones numéricas de patrones visuales. **No constituyen diagnósticos médicos definitivos**.

---

## 🚀 Cómo Ejecutar la Web Localmente

La aplicación está construida con **HTML5 estándar, CSS3 moderno y JavaScript ES6 modular** sin dependencias externas pesadas, por lo que no requiere `npm install` ni compilación.

### Opción 1: Abrir directamente en el navegador
Haz doble clic sobre `index.html` o arrástralo a tu navegador web.

### Opción 2: Usar Visual Studio Code (Live Server)
1. Abre la carpeta `SkinAI` en VS Code.
2. Clic derecho en `index.html` y selecciona **Open with Live Server**.
3. Se abrirá en `http://127.0.0.1:5500`.

### Opción 3: Servidor HTTP simple de Python
```bash
python -m http.server 3000
```
Abre en tu navegador: `http://localhost:3000`.

---

## 🔌 Alternar entre Entorno Local y Producción

Puedes alternar entre los servicios en la nube (Render) y los servicios locales de dos maneras sencillas:

### 1. Desde la Interfaz Gráfica (Sin tocar código)
1. Pulsa el botón **API: Conectada / Desconectada** en la barra superior.
2. En la sección **Entorno Activo**, selecciona:
   - **Automático:** Detecta si estás en `localhost`/`127.0.0.1` (usa local) o en internet (usa Render).
   - **Producción (Render):** Fuerza `https://skinai-backend-ena4.onrender.com` y `https://skinai-backend-chat.onrender.com`.
   - **Local (127.0.0.1):** Fuerza `http://127.0.0.1:8000` y `http://127.0.0.1:8001`.
3. Haz clic en **Comprobar ambas conexiones** para verificar el estado de salud de ambos microservicios y pulsa **Guardar configuración**.

### 2. En el archivo `js/config.js`
En [js/config.js](file:///c:/Users/Usuario/Desktop/SkinAI/js/config.js), cambia la constante:
```javascript
const DEFAULT_ENVIRONMENT = 'auto'; // 'auto' | 'production' | 'local'
```

---

## 🛡️ Configuración de CORS en los Backends

Para que las peticiones funcionen desde el navegador, el origen exacto del frontend debe estar listado en `allow_origins` de ambos servicios FastAPI:

- **GitHub Pages:** `https://iglesiasalvaro.github.io`
- **Desarrollo local (Live Server):** `http://localhost:5500` y `http://127.0.0.1:5500`
- **Desarrollo local (Python Server):** `http://localhost:3000` y `http://127.0.0.1:3000`
- **Archivo local directo (`file:///`):** `"null"`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null",
        "https://iglesiasalvaro.github.io",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ⚖️ Aviso Médico y Legal

> **“SkinAI es un prototipo académico experimental y no constituye un dispositivo médico. Sus resultados no confirman ni descartan enfermedades, no sustituyen la evaluación de un profesional de salud y no deben utilizarse para decidir tratamientos. Si tienes una lesión que te preocupa, consulta a un profesional sanitario”.**
