@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Troca de email do Padilha: adelir@fiobras.com.br -^> padilha@fiobras.com.br
echo.
if not exist node_modules\firebase-admin (
  echo  Instalando firebase-admin...
  call npm install firebase-admin
)
node scripts\trocar-email.js adelir@fiobras.com.br padilha@fiobras.com.br
echo.
pause
