@echo off
cd /d %~dp0
set JAVA_HOME=C:\Program Files\Java\jdk-21
call gradlew.bat assembleDebug
echo EXIT CODE: %ERRORLEVEL%
