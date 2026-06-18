# Privacidad y tratamiento de datos — EstoyAi

EstoyAi procesa **datos personales sensibles** de beneficiarios de la ONG, que
pueden incluir niños, niñas y adolescentes. Este documento describe qué datos se
tratan, dónde viven y cómo se ejercen los derechos. Aplica el marco de la **Ley
25.326 de Protección de Datos Personales** (Argentina) y sus actualizaciones.

## Principio rector: los datos no salen de la sede

Transcripción (whisper), extracción (ollama) y almacenamiento corren **en la PC
de la ONG**. No se envía audio ni texto a servicios comerciales de voz ni a IA
en la nube. Las fuentes e iconos de la interfaz son self-hosted (sin googleapis),
de modo que ni siquiera el navegador del promotor filtra metadatos a terceros.

## Datos tratados

| Dato | Origen | Dónde se guarda |
| --- | --- | --- |
| Audio del registro (WAV) | Celular del promotor | `data/audio/<id>.wav` |
| Transcripción | whisper (local) | SQLite `informe_json` |
| Datos del beneficiario (nombre, apellido, DNI) | Carga del promotor | SQLite `metadata` |
| Informe estructurado | ollama (local) | SQLite + `data/docx/<id>.docx` |

Todo se guarda **sin cifrar** a nivel aplicación (decisión deliberada para no
arriesgar pérdida total de datos por una clave de cifrado olvidada — ver
`SECURITY.md`). La protección frente a robo físico es resguardo del equipo +
backup manual a disco externo, responsabilidad de la institución.

## Backup y continuidad

**El backup de los datos es responsabilidad exclusiva de cada sede.** EstoyAi
no realiza copias automáticas ni garantiza la recuperación de datos en caso de
falla de hardware, pérdida o robo del equipo, o error del operador.

La sede es responsable de:
- Realizar backups periódicos a disco externo u otro medio fuera de la PC.
- Verificar que los backups sean legibles y estén actualizados.
- Definir quién es el responsable institucional del backup y con qué frecuencia.

Si la sede opta por backup en la nube, debe evaluar la legislación aplicable
(Ley 25.326) respecto al alojamiento de datos personales sensibles en
servicios de terceros.

El proveedor del software (EstoyAi) no asume responsabilidad por pérdida de
datos derivada de la ausencia o falla del backup.

## Base de legitimación y consentimiento

La ONG es responsable del tratamiento. Debe contar con base legal para registrar
estos datos (consentimiento del beneficiario/representante o interés legítimo del
programa social). **EstoyAi no captura el consentimiento**: la ONG debe gestionarlo
por sus medios (formulario de admisión al programa) y conservar el registro.

## Retención y minimización

- No hay borrado automático: los registros se conservan mientras la ONG los
  necesite para el seguimiento y la rendición de cuentas.
- Recomendación: definir un período de retención por programa y purgar lo que ya
  no se necesite (ver "Derecho de supresión").

## Derechos de los titulares

- **Acceso / rectificación**: coordinación (rol admin) puede ver y editar el
  informe (`PATCH /api/informe/[id]/editar`).
- **Supresión (derecho al olvido)**: el rol admin borra el registro completo
  (fila SQLite + audio + `.docx`) con `DELETE /api/admin/informe/[id]`. El borrado
  es definitivo y por tenant (un admin solo borra los de su ONG).
- El audio original puede borrarse tras generar el informe si la ONG no lo
  necesita como respaldo.

## Aislamiento entre organizaciones

En una instalación multi-tenant, cada ONG solo accede a sus propios informes: el
servidor valida el tenant (por subdominio) contra el dueño de cada registro. Una
ONG no puede ver ni borrar datos de otra.

## Contacto

Consultas sobre tratamiento de datos: latta.romero@gmail.com.
