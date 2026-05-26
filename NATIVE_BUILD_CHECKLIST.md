# Native Build Checklist (iOS + Android)

Måste göras **en gång** efter `npx cap add ios` / `npx cap add android` på din egen dator. Filerna nedan finns inte i Lovable-projektet — de skapas lokalt av Capacitor.

## iOS — `ios/App/App/Info.plist`

Lägg till inuti `<dict>`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Används för att verifiera att du är på arbetsplatsen vid incheckning.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Behövs för att räkna tid inom 50 m från projektet även när appen är stängd eller telefonen är låst.</string>

<key>NSCameraUsageDescription</key>
<string>Används för selfie-verifiering vid incheckning.</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

## Android — `android/app/src/main/AndroidManifest.xml`

Lägg till överst inuti `<manifest>` (utanför `<application>`):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-feature android:name="android.hardware.location.gps"/>
```

I `<application>`-blocket, lägg till foreground service-deklarationen för bakgrunds-GPS-pluginet:

```xml
<service
    android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
    android:foregroundServiceType="location"
    android:exported="false" />
```

## Efter ändringar

```bash
npm run build
npx cap sync
npx cap run ios     # eller: npx cap run android
```

## Verifiera i butiks-listing

- **App Store privacy nutrition label**: deklarera "Precise Location" + "Photos" + "kopplat till identitet" (lön).
- **Google Play Data Safety**: samma — Location (background) + Camera.
- **Privacy policy** måste nämna GPS-spårning, 50 m-radien, fotot, lagringstid och arbetsgivar-/anställd-relationen. Utan den avvisas appen.
