# Weather App (Android)

Simple Android weather app with manual city selection.

## Implemented

- City input and temperature units selection (`°C` or `°F`) in settings.
- Gear button in UI to change city and units at any time.
- Home screen weather widget.
- Daily weather notifications at a selected time.
- Local persistence for city and unit settings.
- City coordinates via **Open-Meteo Geocoding API**.
- Weather data by coordinates via free **Open-Meteo** API (no key required).
- `Refresh` button for new weather request with current settings.
- Dynamic background and large weather-state icon based on `weather_code`.

## API

- Geocoding endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- Weather endpoint: `https://api.open-meteo.com/v1/forecast`
- Used fields: `temperature_2m`, `weather_code`, `wind_speed_10m`

## Run

1. Open the project folder in Android Studio.
2. Wait for Gradle Sync.
3. Run on emulator or physical device.
4. Enter city and select temperature units on first start.

## Build via GitHub Actions

- Workflow: `.github/workflows/android-build.yml`
- Runs on `push`, `pull_request` for `main/master`, and manual `workflow_dispatch`.
- CI steps: JDK 17 + Android SDK setup, unit tests, `:app:assembleDebug`.
- Built APK is uploaded as artifact `app-debug-apk`.

## Main files

- `app/src/main/java/com/example/weatherapp/MainActivity.kt`
- `app/src/main/res/layout/activity_main.xml`
- `app/src/main/AndroidManifest.xml`
- `app/build.gradle.kts`
