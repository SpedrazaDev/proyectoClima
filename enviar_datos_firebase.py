import firebase_admin
from firebase_admin import credentials, db
import pandas as pd
import random
from datetime import datetime
import time

# ================================
# CONFIGURACIÓN INICIAL
# ================================
cred = credentials.Certificate("proyectoiot-101a5-firebase-adminsdk-fbsvc-bf129984a8.json")  # Clave del servicio Firebase
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://proyectoiot-101a5-default-rtdb.firebaseio.com'  # <-- reemplaza con tu URL
})

ARCHIVO_LOCAL = "datos_ambientales_realtime.csv"
INTERVALO_MINUTOS = 30  # cada cuánto se envía un dato nuevo

# ================================
# FUNCIONES DE GENERACIÓN
# ================================
def generar_temperatura(hora):
    base = 19 + 12 * (1 - abs((hora - 12) / 12))  # más caliente a mediodía
    return round(base + random.uniform(-1.5, 1.5), 2)

def generar_humedad(hora):
    base = 90 - 10 * (1 - abs((hora - 12) / 12))
    return round(base + random.uniform(-2, 2), 2)

def generar_viento(hora):
    base = 6 + 3 * (1 - abs((hora - 14) / 12))
    return round(base + random.uniform(-1, 1), 2)

# ================================
#  ENVÍO A FIREBASE
# ================================
def enviar_a_firebase(lectura):
    ref = db.reference("lecturas")
    ref.push(lectura)
    print(f"📤 Enviado a Firebase: {lectura}")

# ================================
# GUARDAR LOCALMENTE
# ================================
def guardar_localmente(lectura):
    df = pd.DataFrame([lectura])
    try:
        df.to_csv(ARCHIVO_LOCAL, mode='a', header=not pd.io.common.file_exists(ARCHIVO_LOCAL), index=False)
    except Exception as e:
        print(f"⚠️ Error guardando localmente: {e}")

# ================================
# BUCLE PRINCIPAL
# ================================
print("🌍 Iniciando simulador IoT (presiona Ctrl+C para detener)...\n")

try:
    while True:
        ahora = datetime.now()
        hora_actual = ahora.hour

        lectura = {
            "fecha": ahora.strftime("%Y-%m-%d"),
            "hora": ahora.strftime("%H:%M"),
            "temperatura": generar_temperatura(hora_actual),
            "humedad": generar_humedad(hora_actual),
            "viento": generar_viento(hora_actual)
        }

        # Guardar local y enviar
        guardar_localmente(lectura)
        enviar_a_firebase(lectura)

        print(f"✅ Lectura registrada correctamente a las {lectura['hora']}")
        print("----------------------------------------------------")
        time.sleep(INTERVALO_MINUTOS * 60)  # Espera antes de la siguiente lectura

except KeyboardInterrupt:
    print("\n🛑 Simulación detenida por el usuario.")


