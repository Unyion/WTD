!macro customHeader
  !define MUI_FINISHPAGE_LINK "View the What To Do project on GitHub"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/Unyion/WTD"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall 1
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend