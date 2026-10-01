# Next Steps for Quran Video Studio

## 1. Google Play Console
- Go to Google Play Console > App Integrity > App Signing.
- Click "Request upload key reset".
- Upload the file: upload_certificate.pem

## 2. GitHub Repository Secrets
Go to Settings > Secrets and variables > Actions, and create:
- ANDROID_KEYSTORE_BASE64: (content from keystore_base64.txt)
- ANDROID_KEYSTORE_PASSWORD: QuranVideoStudio2026!
- ANDROID_KEY_ALIAS: quran-key
- ANDROID_KEY_PASSWORD: QuranVideoStudio2026!
