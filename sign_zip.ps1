$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw "C:\Users\Luis Javier\Documents\DestinyKanban\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "testpassword123"
$filepath = $args[0]
npx tauri signer sign $filepath
