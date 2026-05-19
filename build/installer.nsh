; What To Do - NSIS Installer Configuration
; Minimal installer - version management handled by the app

!macro customInit
  ; Detect existing installation and use that directory
  StrCpy $INSTDIR ""
  
  ; Check 64-bit registry
  SetRegView 64
  ReadRegStr $INSTDIR HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${If} $INSTDIR == ""
    ReadRegStr $INSTDIR HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${EndIf}
  
  ; Check 32-bit registry if needed
  ${If} $INSTDIR == ""
    SetRegView 32
    ReadRegStr $INSTDIR HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${EndIf}
  ${If} $INSTDIR == ""
    ReadRegStr $INSTDIR HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${EndIf}
  
  ; Validate installation exists
  ${If} $INSTDIR != ""
    ${Unless} ${FileExists} "$INSTDIR\What To Do.exe"
      StrCpy $INSTDIR ""
    ${EndUnless}
  ${EndIf}
!macroend

!macro customInstallMode
  ${If} $INSTDIR != ""
    StrCpy $isForceCurrentInstall 1
  ${EndIf}
!macroend