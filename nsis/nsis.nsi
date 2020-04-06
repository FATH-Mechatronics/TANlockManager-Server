Unicode true

!macro CreateInternetShortcut FILEPATH URL
WriteINIStr "${FILEPATH}" "InternetShortcut" "URL" "${URL}"
!macroend

!macro CreateInternetShortcutWithIcon FILEPATH URL ICONPATH ICONINDEX
WriteINIStr "${FILEPATH}" "InternetShortcut" "URL" "${URL}"
WriteINIStr "${FILEPATH}" "InternetShortcut" "IconIndex" "${ICONINDEX}"
WriteINIStr "${FILEPATH}" "InternetShortcut" "IconFile" "${ICONPATH}"
!macroend


!define MUI_PRODUCT "TANlockManager-Server"
!define PROD_TYPE "Server"

CRCCheck On

Name "${MUI_PRODUCT}"
OutFile "..\dist_install\${MUI_PRODUCT}-Setup.exe"

RequestExecutionLevel admin

InstallDir "$PROGRAMFILES64\${MUI_PRODUCT}"

Var StartMenuFolder

!include MUI2.nsh
!include LogicLib.nsh
!include StrRep.nsh
!include ".\TANlockManagerBaseConfig.nsdinc"

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${MUI_PRODUCT} Installer"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "../LICENSE"
!insertmacro MUI_PAGE_DIRECTORY

;Start Menu Folder Page Configuration
!define MUI_STARTMENUPAGE_REGISTRY_ROOT "HKLM"
!define MUI_STARTMENUPAGE_REGISTRY_KEY "Software\${MUI_PRODUCT}"
!define MUI_STARTMENUPAGE_REGISTRY_VALUENAME "Start Menu Folder"

;Dektop Shortcut
;!define MUI_FINISHPAGE_SHOWREADME ""
;!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
;!define MUI_FINISHPAGE_SHOWREADME_TEXT "Create Desktop Shortcut"
;!define MUI_FINISHPAGE_SHOWREADME_FUNCTION finishpageaction

!insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder
!insertmacro MUI_PAGE_INSTFILES
Page custom fnc_TANlockManagerBaseConfig_Show doneBaseConfig
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "install" "${MUI_PRODUCT}"
    SetShellVarContext all
    SetOutPath "$INSTDIR"
    WriteUninstaller "$INSTDIR\uninstall.exe"

    SetOutPath "$INSTDIR\bin"
    File /r "..\dist_install\bin\"
    File ".\start.bat"

    !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortcut "$SMPROGRAMS\$StartMenuFolder\${MUI_PRODUCT} - Uninstall.lnk" "$INSTDIR\uninstall.exe"
    !insertmacro CreateInternetShortcutWithIcon "$SMPROGRAMS\$StartMenuFolder\${MUI_PRODUCT}.URL" "https://localhost:4343/" "$INSTDIR\bin\favicon.ico" 4
    !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

Function finishpageaction
  SetShellVarContext all
  !insertmacro CreateInternetShortcutWithIcon "$DESKTOP\${MUI_PRODUCT}.URL" "https://localhost:4343/" "$INSTDIR\bin\favicon.ico" 4
FunctionEnd

Section "Uninstall"
  SetShellVarContext all

  SimpleSC::StopService "${MUI_PRODUCT}" 1 30
  SimpleSC::RemoveService "${MUI_PRODUCT}"
  SimpleFC::AdvRemoveRule "$INSTDIR\bin\node.exe"

  ;; RMDir /r "$INSTDIR\availablePlugins"
  RMDir /r "$INSTDIR\bin"

  Delete "$DESKTOP\${MUI_PRODUCT}.URL"

  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
  RMDir /r "$SMPROGRAMS\$StartMenuFolder"
  DeleteRegKey /ifempty HKLM "Software\${MUI_PRODUCT}"

  Delete "$INSTDIR\uninstal.exe"
SectionEnd


Var InstallService
Var AddFirewallException
Var DataBasePath
Var BaseURL
Function "doneBaseConfig"
  ${NSD_GetState} $hCtl_TANlockManagerBaseConfig_AddServiceCheckBox $InstallService
  ${NSD_GetState} $hCtl_TANlockManagerBaseConfig_AddFirewallCheckBox $AddFirewallException
  ${NSD_GetText} $hCtl_TANlockManagerBaseConfig_BasepathDirRequest_Txt $DataBasePath
  ${NSD_GetText} $hCtl_TANlockManagerBaseConfig_ClientBaseURLTextBox $BaseURL

  ${If} ${PROD_TYPE} == "UI"
    FileOpen $9 "$INSTDIR\bin\config.json" w
    FileWrite $9 "{$\"baseURL$\":$\"$BaseURL$\"}"
    FileClose $9
  ${Else}
    ${StrRep} '$0' '$DataBasePath' '\' '\\'
    FileOpen $9 "$INSTDIR\bin\config.json" w
    FileWrite $9 "{$\"basePath$\":$\"$0$\"}"
    FileClose $9
    CreateDirectory "$DataBasePath\plugins"
  ${EndIf}

  ${If} $InstallService == 1
    ${StrRep} '$0' '$DataBasePath' '\' '\\'
    FileOpen $9 "$INSTDIR\bin\config.json" w
    FileWrite $9 "{$\"basePath$\":$\"$0$\"}"
    FileClose $9

    CreateDirectory "$DataBasePath\plugins"

    ${If} $AddFirewallException == 1
      SimpleFC::AdvExistsRule "${MUI_PRODUCT}"
      Pop $0 ; return error(1)/success(0)
      Pop $1 ; return 1=Added/0=Not added
      ${If} $0 == 1
        MessageBox MB_OK|MB_ICONEXCLAMATION "Unable to check current Firewall Status"
      ${Else}
        ${If} $1 == 0 ;;NOTADDED
            ;SimpleFC::AddApplication "${MUI_PRODUCT}" "$INSTDIR\bin\node.exe" 0 2 "" 1
            SimpleFC::AdvAddRule "${MUI_PRODUCT}" "${MUI_PRODUCT} REST Server (TCP)" "6" "1" "1" "7" "1" "$INSTDIR\bin\node.exe" \
              "" "" "@$INSTDIR\bin\node.exe,-10000" "" ""
            Pop $0
            ${If} $0 == 1
              MessageBox MB_OK|MB_ICONEXCLAMATION "Unable to create Firewall Rule"
            ${EndIf}
        ${Else} ;; ADDED
            SimpleFC::IsApplicationEnabled "$INSTDIR\bin\node.exe"
            Pop $0 ; err(1) succ(0)
            Pop $1 ; enabled(1) disabled (0)
            ${If} $0 == 0
              ${If} $1 == 0
                SimpleFC::EnableDisableApplication "$INSTDIR\bin\node.exe" 1
                Pop $0
                ${If} $0 == 1
                  MessageBox MB_OK|MB_ICONEXCLAMATION "Unable to enable Firewall Rule"
                ${EndIf}
              ${EndIf}
            ${Else}
              MessageBox MB_OK|MB_ICONEXCLAMATION "Unable to check state of Firewall Rule"
            ${EndIf}
        ${EndIf}
      ${EndIf}
    ${EndIf}


    SetOutPath "$INSTDIR\bin"
    File ".\nssm.exe"
    SimpleSC::ExistsService "${MUI_PRODUCT}"
    Pop $0
    ${If} $0 != 0
        nsExec::Exec '"$INSTDIR\bin\nssm.exe" install "${MUI_PRODUCT}" "$INSTDIR\bin\start.bat"'
        nsExec::Exec '"$INSTDIR\bin\nssm.exe" set "${MUI_PRODUCT}" Description "${MUI_PRODUCT} REST Service"'
        nsExec::Exec '"$INSTDIR\bin\nssm.exe" set "${MUI_PRODUCT}" AppDirectory "$INSTDIR\bin"'
        nsExec::Exec '"$INSTDIR\bin\nssm.exe" set "${MUI_PRODUCT}" AppParameters "."'
    ${EndIf}

    SimpleSC::GetServiceStatus "${MUI_PRODUCT}"
    Pop $0 ; returns an errorcode (<>0) otherwise success (0)
    Pop $1 ; return the status of the service (See "service_status" in the parameters)
    ${If} $0 == 0
      ${If} $1 == 1
        SimpleSC::StartService "${MUI_PRODUCT}" "" 5
        Pop $0
        ${If} $0 != 0
          MessageBox MB_OK|MB_ICONEXCLAMATION "Unable to start Service"
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}

FunctionEnd
