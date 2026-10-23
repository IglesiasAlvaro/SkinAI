# SkinAI — Frontend Web (Prototipo Académico)

Aplicación web moderna, accesible y adaptable para la clasificación experimental de imágenes dermatológicas mediante el modelo de visión por computador **SkinAI v2** (basado en la arquitectura *EfficientNetB0* y entrenado con el conjunto público de datos *HAM10000*).

---

## Objetivo del Proyecto

Proporcionar una interfaz gráfica intuitiva, profesional y rigurosa para estudiantes e investigadores de Ingeniería de Sistemas y ciencias de la salud. Permite seleccionar una imagen dermatoscópica, previsualizarla con validación local y enviarla mediante `multipart/form-data` al backend de **FastAPI** (`POST /predict`) para recibir y visualizar las puntuaciones Softmax de las siete clases cutáneas estudiadas.

---

##  Estructura del Proyecto

```text
SkinAI/
├── index.html              # Estructura semántica HTML5, accesible y responsive
├── css/
│   └── styles.css          # Sistema de diseño: variables CSS, paleta salud/tech, estados y animaciones
├── js/
│   ├── config.js           # Configuración centralizada: URL de API, límites (10 MB) y metadatos de las 7 clases
│   ├── api.js              # Capa de servicio aislada para FastAPI (GET /health y POST /predict)
│   └── app.js              # Controlador de UI/UX: drag & drop, vista previa, validaciones y renderizado
├── assets/
│   └── favicon.svg         # Favicon vectorial con motivo dermatológico y de IA
└── README.md               # Guía completa de arquitectura, ejecución y conexión con el backend
```

---

##  Las 7 Clases Dermatológicas Evaluadas

El modelo fue entrenado con las 7 categorías diagnósticas de HAM10000, respetando el mapeo oficial:

1. **`akiec`**: Queratosis actínica / Carcinoma intraepitelial (Bowen).
2. **`bcc`**: Carcinoma basocelular.
3. **`bkl`**: Lesiones queratósicas benignas (queratosis seborreica, léntigo).
4. **`df`**: Dermatofibroma (histiocitoma fibroso benigno).
5. **`mel`**: Melanoma (neoplasia melanocítica invasiva o in situ).
6. **`nv`**: Nevo melanocítico (lunar benigno común).
7. **`vasc`**: Lesiones vasculares (angiomas, granulomas piógenos).

> **Aviso de interpretación:** Las puntuaciones mostradas corresponden a la salida Softmax del modelo y representan correlaciones numéricas de patrones visuales. **No constituyen diagnósticos médicos definitivos**.

---

##  Cómo Ejecutar la Web Localmente

La aplicación está construida con **HTML5 estándar, CSS3 moderno y JavaScript ES6 modular** sin dependencias externas pesadas, por lo que no requiere `npm install` ni compilación.

### Opción 1: Abrir directamente en el navegador (La más sencilla)
Haz doble clic sobre el archivo `index.html` o arrástralo a tu navegador web favorito (Google Chrome, Microsoft Edge, Mozilla Firefox o Safari).

### Opción 2: Usar Visual Studio Code (Live Server)
1. Abre la carpeta `SkinAI` en Visual Studio Code.
2. Si tienes la extensión **Live Server**, haz clic derecho en `index.html` y selecciona **Open with Live Server**.
3. Se abrirá automáticamente en `http://127.0.0.1:5500`.

### Opción 3: Usar un servidor HTTP simple de Python (si tienes Python en tu PC)
Abre PowerShell o terminal en la carpeta `SkinAI` y ejecuta:
```bash
python -m http.server 3000
```
Luego abre en tu navegador: `http://localhost:3000`.

---

## Integración y Conexión con FastAPI

La interfaz se comunica con el backend mediante dos endpoints clave:
* `GET /health`: Comprueba el estado del servidor y del modelo cargado en memoria.
* `POST /predict`: Envía la imagen mediante `multipart/form-data` con el campo `file` y recibe el vector de puntuaciones.

### 1. Configuración de la URL de la API
Puedes configurar la dirección del backend de dos formas:
* **Desde la Interfaz Gráfica:** Haz clic en el botón superior **API: Desconectada / Conectada** para abrir el modal de configuración, introduce la URL y pulsa **Comprobar** y luego **Guardar configuración** (se guarda de forma persistente en `localStorage`).
* **En el archivo de código:** Edita `DEFAULT_API_BASE_URL` en [js/config.js](file:///c:/Users/Usuario/Desktop/SkinAI/js/config.js).

---

###  Importante para estudiantes: Backend en Google Colab vs. Computador Local

Si el modelo y el archivo `main.py` de FastAPI se encuentran ejecutándose en una celda de **Google Colab**:

> [!WARNING]
> **El navegador de tu computadora NO puede conectarse a `http://localhost:8000` si uvicorn corre en Google Colab.**  
> `localhost` dentro de Colab hace referencia a la máquina virtual remota en la nube de Google, no a tu computador local.

Para conectar el frontend con FastAPI tienes dos alternativas:

#### Alternativa A: Ejecutar FastAPI en tu computador local (Recomendado)
1. Descarga el modelo `efficientnetb0_skinai_v2_finetuned.keras` y la carpeta `api/` a tu computadora.
2. Instala dependencias:
   ```bash
   pip install fastapi uvicorn pillow numpy tensorflow python-multipart
   ```
3. Inicia el servidor local:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. En el frontend, la URL por defecto `http://localhost:8000` se conectará inmediatamente.

#### Alternativa B: Exponer Google Colab mediante un túnel seguro (ngrok)
1. En tu notebook de Google Colab, instala `pyngrok`:
   ```python
   !pip install pyngrok uvicorn
   ```
2. Inicia el túnel público:
   ```python
   from pyngrok import ngrok
   # Reemplaza con tu authtoken gratuito de ngrok.com si es necesario
   # ngrok.set_auth_token("TU_TOKEN")
   public_url = ngrok.connect(8000)
   print(f"URL pública para el frontend: {public_url}")
   ```
3. Ejecuta `uvicorn main:app --port 8000` en Colab.
4. Copia la URL pública HTTPS generada (ej. `https://xxxx.ngrok-free.app`) y pégala en el panel de configuración de la API de este frontend.

---

### Habilitar CORS en FastAPI (Requisito indispensable)

Para que el navegador permita enviar peticiones desde `index.html` hacia la API, `main.py` debe tener configurado el middleware de CORS:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SkinAI API")

# Habilitar CORS para permitir peticiones desde el frontend web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se restringe a dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Modo Demostración Académica

Si aún no has iniciado el backend o estás en una presentación académica sin acceso a la GPU, puedes activar el **Modo Demostración**:
1. Haz clic en el indicador de la API en la barra superior.
2. Activa el interruptor **Modo Demostración Académica**.
3. La interfaz procesará la imagen seleccionada y generará una simulación de puntuaciones para calibrar y demostrar la respuesta visual de la interfaz, etiquetando claramente el resultado como *Simulado*.

---

##  Aviso Médico y Legal

> **“SkinAI es un prototipo académico experimental y no constituye un dispositivo médico. Sus resultados no confirman ni descartan enfermedades, no sustituyen la evaluación de un profesional de salud y no deben utilizarse para decidir tratamientos. Si tienes una lesión que te preocupa, consulta a un profesional sanitario”.**
