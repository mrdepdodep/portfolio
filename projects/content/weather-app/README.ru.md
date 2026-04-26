# Weather App (Android)

Простое Android-приложение погоды с ручным выбором города.

## Что реализовано

- Ввод города и выбор единиц температуры (`°C` или `°F`) в настройках.
- Кнопка-шестерня в интерфейсе для изменения города и единиц в любое время.
- Виджет погоды на главный экран.
- Ежедневные уведомления о погоде в выбранное время.
- Локальное сохранение настроек города и единиц.
- Запрос координат города через **Open-Meteo Geocoding API**.
- Запрос погоды по координатам через бесплатный **Open-Meteo** API (без ключа).
- Кнопка `Обновить` для повторного запроса по текущим настройкам.
- Динамический фон и крупная иконка состояния погоды по `weather_code`.

## API

- Geocoding endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- Weather endpoint: `https://api.open-meteo.com/v1/forecast`
- Используемые поля: `temperature_2m`, `weather_code`, `wind_speed_10m`

## Запуск

1. Открой папку проекта в Android Studio.
2. Дождись Gradle Sync.
3. Запусти на эмуляторе или физическом устройстве.
4. При первом запуске введи город и выбери единицы температуры.

## Сборка через GitHub Actions

- Workflow: `.github/workflows/android-build.yml`
- Запускается на `push`, `pull_request` для `main/master`, а также вручную (`workflow_dispatch`).
- Шаги CI: установка JDK 17 + Android SDK, unit-тесты, сборка `:app:assembleDebug`.
- Готовый APK сохраняется как artifact `app-debug-apk`.

## Основные файлы

- `app/src/main/java/com/example/weatherapp/MainActivity.kt`
- `app/src/main/res/layout/activity_main.xml`
- `app/src/main/AndroidManifest.xml`
- `app/build.gradle.kts`
