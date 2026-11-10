# Guía de uso (modo asistente, 0 €)

1. Abre la aplicación y pulsa **Añadir archivos**. Selecciona `examen.json`, los PDF de los estudiantes e `identidades.csv`.
2. Para cada estudiante, en una conversación **nueva** de ChatGPT o Claude:
   - adjunta el PDF **seudonimizado** (`E##.pdf`), `examen.json` y `esquema_correccion.json`;
   - pulsa **Copiar instrucciones para el asistente** y pega el texto;
   - guarda la respuesta como `E##.json` (o como `.txt`: la aplicación extrae el JSON).
3. Vuelve a **Añadir archivos** y selecciona esos JSON. Los que no cumplen el formato se rechazan con el motivo.
4. En **Revisar**, comprueba cada actividad, cambia lo que haga falta y pulsa **Aprobar corrección**.
5. En **Exportar**, descarga el Excel y el zip de PDF corregidos.

Los nombres solo existen en tu dispositivo: el asistente recibe únicamente el código `E##` y las páginas con el nombre tapado.
Si en la aplicación cargas el PDF original en lugar del seudonimizado, el PDF corregido saldrá con la cabecera original.
