  [Setup]
  AppName=EstoyAi
  AppVersion=1.6
  AppPublisher=Lautaro R. Temperini
  DefaultDirName={autopf}\EstoyAi
  CreateAppDir=yes
  OutputDir=Output
  OutputBaseFilename=EstoyAi-Installer-1.6
  SetupIconFile=sistema\icono.ico
  Compression=lzma
  SolidCompression=yes
  WizardStyle=modern
  PrivilegesRequired=admin
  AlwaysRestart=yes
  MinVersion=10.0.19041

  [Languages]
  Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

  [Messages]
  WelcomeLabel1=Instalador de EstoyAi
  WelcomeLabel2=Este asistente instala todo lo necesario automáticamente.%n%nPasos:%n  1. Activar WSL2 y virtualización de Windows%n  2. Instalar Rancher Desktop (motor de contenedores)%n  3. Descargar los servicios y el modelo de IA%n%nLa primera instalación tarda 20-30 minutos según tu conexión.%n%nLa PC se reiniciará automáticamente. Al volver, el sistema termina de configurarse solo y se abre en el navegador. No necesitás hacer nada más.
  FinishedRestartLabel=Instalación base completa.%n%nLa PC necesita reiniciarse para activar WSL2 y completar la instalación de Rancher Desktop. Si no reiniciás ahora, el sistema no va a funcionar hasta que lo hagas manualmente.%n%nTené en cuenta que al reiniciar el sistema se va a terminar de configurar solo (puede tardar 15 minutos) y se abre en el navegador automáticamente. No cierres las ventanas que aparezcan.

  ; Estructura instalada (sin números: todo es automático; los puntos de entrada
  ; del usuario son los accesos directos del escritorio):
  ;   {app}\LEEME.txt                      guía para el responsable de la sede
  ;   {app}\iniciar-sistema.bat            ← icono "EstoyAi"
  ;   {app}\diagnostico.bat                ← icono "Diagnóstico EstoyAi"
  ;   {app}\primera-vez.bat                automático (tarea programada / red de seguridad)
  ;   {app}\docker-compose.yml             definición de los servicios
  ;   {app}\n8n\workflows\registro.json    workflow pre-cargado
  ;   {app}\sistema\                       interno (MSI de Rancher, herramientas, icono)
  ;   {app}\.env, *.log                    generados en el primer arranque
  [Files]
  Source: "sistema\instalador-rancher.msi"; DestDir: "{app}\sistema"
  Source: "sistema\update-workflow.bat"; DestDir: "{app}\sistema"
  Source: "sistema\icono.ico"; DestDir: "{app}\sistema"
  Source: "iniciar-sistema.bat"; DestDir: "{app}"
  Source: "primera-vez.bat"; DestDir: "{app}"
  Source: "diagnostico.bat"; DestDir: "{app}"
  Source: "docker-compose.yml"; DestDir: "{app}"
  Source: "n8n\workflows\registro.json"; DestDir: "{app}\n8n\workflows"
  Source: "LEEME.txt"; DestDir: "{app}"

  ; Limpieza al actualizar desde builds anteriores (nombres con número, estado.bat).
  [InstallDelete]
  Type: files; Name: "{app}\1-instalar-rancher.msi"
  Type: files; Name: "{app}\2-iniciar-sistema.bat"
  Type: files; Name: "{app}\estado.bat"
  Type: files; Name: "{app}\update-workflow.bat"
  Type: files; Name: "{app}\icono.ico"

  [Dirs]
  Name: "{localappdata}\rancher-desktop"

  [Icons]
  Name: "{commondesktop}\EstoyAi"; Filename: "{app}\iniciar-sistema.bat"; IconFilename: "{app}\sistema\icono.ico"; Comment: "Iniciar sistema EstoyAi"
  Name: "{commondesktop}\Diagnóstico EstoyAi"; Filename: "{app}\diagnostico.bat"; IconFilename: "{app}\sistema\icono.ico"; Comment: "Ver estado del sistema"
  Name: "{commonstartmenu}\EstoyAi"; Filename: "{app}\iniciar-sistema.bat"; IconFilename: "{app}\sistema\icono.ico"

  [Registry]
  ; Rancher arranca con Windows desde el PRIMER reinicio. (El autoStart de su
  ; settings.json recién se aplica después de que Rancher corre una vez.)
  Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "RancherDesktop"; ValueData: """{autopf}\Rancher Desktop\Rancher Desktop.exe"""; Flags: uninsdeletevalue

  [Run]
  ; 1 — Virtual Machine Platform
  Filename: "{cmd}"; Parameters: "/c dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart & exit 0"; StatusMsg: "Activando virtualización..."; Flags: waituntilterminated runhidden
  ; 2 — Subsistema Linux
  Filename: "{cmd}"; Parameters: "/c dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart & exit 0"; StatusMsg: "Activando subsistema Linux..."; Flags: waituntilterminated runhidden
  ; 3 — WSL2 install + update + default v2
  Filename: "{cmd}"; Parameters: "/c wsl.exe --install --no-distribution & exit 0"; StatusMsg: "Instalando WSL2..."; Flags: waituntilterminated runhidden
  Filename: "{cmd}"; Parameters: "/c wsl.exe --update & exit 0"; StatusMsg: "Actualizando WSL2..."; Flags: waituntilterminated runhidden
  Filename: "{cmd}"; Parameters: "/c wsl.exe --set-default-version 2 & exit 0"; StatusMsg: "Configurando WSL2..."; Flags: waituntilterminated runhidden
  ; 4 — Config de Rancher (fuerza backend moby/dockerd + autostart)
  Filename: "{cmd}"; Parameters: "/c echo {{""kubernetes"":{{""enabled"":false}},""containerEngine"":{{""name"":""moby""}},""application"":{{""adminAccess"":false,""startInBackground"":true,""autoStart"":true}}}} > ""{localappdata}\rancher-desktop\settings.json"""; StatusMsg: "Configurando motor de contenedores..."; Flags: waituntilterminated runhidden
  ; 5 — Intento de instalar Rancher Desktop (elevado, antes del reinicio). Si falla
  ;     (p. ej. el MSI exige WSL ya activo), primera-vez.bat lo reintenta tras el
  ;     reinicio — también elevado, vía la tarea programada del paso 6. El log
  ;     msi-preinstall.log queda en {app} para diagnóstico.
  Filename: "msiexec.exe"; Parameters: "/i ""{app}\sistema\instalador-rancher.msi"" /quiet /norestart /l*v ""{app}\msi-preinstall.log"""; StatusMsg: "Instalando Rancher Desktop (puede tardar varios minutos)..."; Flags: waituntilterminated
  ; 6 — Tarea programada ELEVADA para el primer logon tras el reinicio (el RunOnce de
  ;     HKCU corría sin admin y el MSI fallaba en silencio). Se usa schtasks (más
  ;     portable que Register-ScheduledTask, que falló silenciosamente en un equipo)
  ;     y su salida queda en task-setup.log para diagnosticar si no se crea.
  ;     primera-vez.bat borra la tarea al completarse; si algo falla, reintenta en
  ;     cada inicio de sesión. iniciar-sistema.bat es la red de seguridad adicional.
  Filename: "{cmd}"; Parameters: "/c schtasks /create /f /sc onlogon /rl highest /tn EstoyAiPrimeraVez /tr ""\""{app}\primera-vez.bat\"""" > ""{app}\task-setup.log"" 2>&1"; StatusMsg: "Programando configuración automática..."; Flags: waituntilterminated runhidden
