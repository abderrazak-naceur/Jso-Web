# Swish Live + Livepeer + JSO Web

This integration uses Swish Live as the mobile production app (camera + scoreboard burned into the video). In JSO admin you can choose Livepeer (RTMP ingest), Mux (existing setup), or Custom HTTPS player/embed. JSO Web remains responsible for match configuration, checkout, and entitlement checks.

## One-time provider setup

1. Create a Livepeer Studio account and an API stream in its dashboard.
2. From the stream details, copy the RTMP ingest URL and stream key.
3. In Swish Live, choose a custom RTMP destination and paste the ingest URL and stream key. Configure the sport, teams, colors and scoreboard in Swish Live; the score overlay is part of the encoded video, so JSO does not need to draw a second scoreboard.
4. From Livepeer, copy the Playback ID. In JSO admin, open Gestione dirette, choose the match, select Livepeer (Swish Live) and set the playback URL to https://lvpr.tv/?v=PLAYBACK_ID.
5. Set the price/currency, start/end times and publish only after the playback URL is saved and a test broadcast has been verified.

The RTMP ingest URL and stream key are production credentials. Do not put them in the JSO playback URL field, frontend code, public pages, screenshots or commits. Restrict them to trusted match operators and rotate the stream key if it is exposed.

## Provider options\n\n- **Livepeer**: recommended first RTMP receiver for Swish Live; configure the playback URL from the Livepeer Playback ID.\n- **Mux**: retained for existing matches and configurations.\n- **Custom HTTPS player/embed**: for another provider's embeddable player. Supply the HTTPS embed URL, not the RTMP ingest URL or stream key. The provider must permit iframe embedding. A direct `.m3u8` HLS URL is not necessarily an embeddable player URL and may require a dedicated HLS player.\n\nAn RTMP ingest address is where Swish Live sends the broadcast; it is not the playback URL viewers watch. Keep those two values separate.\n\n## Paid access

The existing JSO pay-per-view flow is retained. Unpaid viewers receive metadata without the playback URL; the API reveals it only for a free stream, a server-confirmed Paid/Promo entitlement, or an authorized staff preview. Payment remains confirmed by the configured payment-provider webhook, not by the browser redirect.

Security limitation: this is application-level link gating, not DRM. A public Livepeer playback ID/player URL may be copied by an entitled viewer and shared. Before selling high-value broadcasts, configure Livepeer playback access control (JWT or webhook policy) and have JSO issue/validate viewer-specific playback authorization. Do not describe a public playback URL as impossible to share.

## Verification checklist (must pass before merge/deploy)

- [ ] Configure a dedicated Livepeer test stream and test with Swish Live before touching a real match.
- [ ] Verify RTMP ingest, audio/video, scoreboard visibility and player playback on desktop and mobile.
- [ ] Verify an anonymous viewer cannot obtain the playback URL for a paid stream.
- [ ] Verify an unpaid authenticated fan cannot obtain the playback URL.
- [ ] Verify paid and valid Promo users can play after server-side entitlement is confirmed.
- [ ] Verify an administrator can preview without generating a paid transaction.
- [ ] Verify the legacy Mux configuration still renders for existing streams.\n- [ ] Verify a Custom HTTPS player is embeddable and does not bypass the chosen provider's access control.
- [ ] Run backend Release build, backend tests, frontend build/lint and GitHub Actions.
- [ ] Confirm Render API and frontend deployment only after all checks pass.

## References

- Swish Live custom RTMP and embedded scoreboard: https://swishlive.com/it/about
- Livepeer RTMP stream setup: https://docs.livepeer.org/guides/stream-via-obs
- Livepeer playback access control: https://docs.livepeer.org/platforms/livepeer-studio/access-control/overview
