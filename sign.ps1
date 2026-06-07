$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw updater.key
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "testpassword123"
npx tauri signer sign "src-tauri\target\release\bundle\nsis\DestinyKanban_1.0.3_x64-setup.exe"
