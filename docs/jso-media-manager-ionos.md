# JSO Media Manager — IONOS + Render

## Architettura
- Portale statico: media-manager/index.html; pubblicarlo come index.html nella directory IONOS che corrisponde a https://jso-media.com/jso/.
- API: servizio jso-api su Render; riusa POST /api/auth/login, GET /api/auth/me e i ruoli amministrativi esistenti.
- File: Hosting IONOS via SFTP; database MediaAssets invariato, nessuna migrazione.
- Swagger è già presente e resta disabilitato in produzione salvo Swagger__Enabled=true temporaneo.

## Variabili Render (solo servizio API)
| Variabile | Valore |
|---|---|
| Sftp__Host | host SFTP fornito da IONOS |
| Sftp__Port | 22, confermare con IONOS |
| Sftp__Username | username SFTP |
| Sftp__Password | password SFTP |
| Sftp__HostKeyFingerprint | fingerprint SHA256 verificato del server |
| Sftp__RootPath | percorso remoto assoluto che corrisponde alla cartella pubblica /jso/ |
| Sftp__PublicBaseUrl | https://jso-media.com/jso |

Il percorso remoto effettivo va verificato nel pannello IONOS; non assumere che sia /htdocs/jso. I file saranno in media/YYYY/MM e gli URL pubblici saranno sotto https://jso-media.com/jso/media/.... Il backend verifica il fingerprint della chiave host e rifiuta fingerprint non corrispondenti. Recuperarlo da IONOS/supporto tramite un canale attendibile.

## Pubblicazione portale
1. Scaricare media-manager/index.html dal branch/PR.
2. Caricarlo via SFTP come index.html nella directory che serve /jso/. Non sovrascrivere file non correlati.
3. Aprire https://jso-media.com/jso/ e verificare che l'URL API sia https://jso-api.onrender.com (modificabile nel form se l'URL attivo è diverso).
4. Effettuare login con le credenziali amministrative JSO.
5. CORS include https://jso-media.com e https://www.jso-media.com.

## API esistenti
- POST /api/admin/media/upload — upload JWT, ruoli SuperAdmin/ClubAdmin/Editor.
- GET /api/admin/media — elenco JWT.
- DELETE /api/admin/media/{id} — elimina file e record JWT.
- POST /api/auth/login e GET /api/auth/me — autenticazione amministrativa esistente.
- /swagger — in produzione solo con Swagger__Enabled=true.

Upload: JPEG, PNG, WebP e GIF, massimo 10 MiB, firma binaria validata. Il token è conservato solo in sessionStorage per la scheda e le credenziali non vengono salvate.

## Compatibilità e rollout
- Se Sftp__Host non è configurato, il backend mantiene il salvataggio locale legacy per sviluppo/compatibilità; lo storage locale Render non è persistente.
- Se Sftp__Host è configurato, le altre impostazioni SFTP sono obbligatorie e gli errori non fanno fallback silenzioso su disco.
- I record vecchi con StoragePath uploads/... sono ancora gestiti dal percorso legacy se il file è presente.
- L'endpoint dedicato /api/admin/media/membership-artwork/{side} mantiene per ora il flusso GitHub esistente e va migrato separatamente dopo la validazione di questo rollout.
- Non eliminare i file locali esistenti prima di aver copiato/verificato immagini e URL.

## Collaudo prima della produzione
- [ ] Configurare variabili SFTP e fingerprint su Render.
- [ ] Caricare il portale su IONOS.
- [ ] Login autorizzato e verifica ruolo.
- [ ] Upload JPEG/PNG/WebP e verifica URL HTTPS.
- [ ] Rifiuto file falsificati e file >10 MiB.
- [ ] Elenco, copia URL, cancellazione e audit.
- [ ] Verifica immagini su sito e app Flutter.
- [ ] Disabilitare Swagger dopo la verifica, se non serve.
