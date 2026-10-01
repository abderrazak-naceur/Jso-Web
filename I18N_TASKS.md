# JSO Web — Multilingual Roadmap

Branch: `feature/i18n-multilingual`

Supported public languages:
- 🇫🇷 `fr` — Français (default)
- 🇬🇧 `en` — English
- 🇮🇹 `it` — Italiano
- 🇹🇳 `ar` — العربية (RTL)

## Tasks

### Phase 1 — i18n foundation
- [x] I18N-001 — Create multilingual architecture and language inventory.
- [x] I18N-002 — Add lightweight React i18n provider and translation dictionaries.
- [x] I18N-003 — Persist selected language in localStorage and use browser language as initial fallback.
- [x] I18N-004 — Add public language selector to the header.
- [x] I18N-005 — Set document `lang`, `dir`, and `data-language`; Arabic uses RTL.

### Phase 2 — Public shell
- [x] I18N-006 — Translate core Header labels and accessibility labels.
- [x] I18N-008 — Translate Footer and newsletter shell.
- [ ] I18N-007 — Translate all Homepage UI strings.
- [ ] I18N-009 — Translate News UI.
- [ ] I18N-010 — Translate Ticketing UI.
- [ ] I18N-011 — Translate Match Center / Team UI.
- [ ] I18N-012 — Translate remaining forms, dialogs, validation and error messages.

### Phase 3 — Backend and content
- [ ] I18N-013 — Add language negotiation to API requests.
- [ ] I18N-014 — Add database translation model and migration.
- [ ] I18N-015 — Localize News content.
- [ ] I18N-016 — Localize Homepage/CMS content.
- [ ] I18N-017 — Localize club content and other persisted public content.
- [ ] I18N-019 — Implement fallback: requested language → French → available content.

### Phase 4 — Admin
- [ ] I18N-018 — Add Admin → Système → Configuration → Langues.
- [ ] I18N-020 — Add assisted/AI translation workflow with review before publishing.

### Phase 5 — SEO and quality
- [ ] I18N-021 — Add multilingual SEO metadata, hreflang, canonical URLs and sitemap strategy.
- [ ] I18N-022 — Complete Arabic RTL visual and interaction QA.
- [ ] I18N-023 — Add automated i18n coverage/tests.
- [ ] I18N-024 — Production QA and Render deployment.

## Implementation rules

1. French remains the default language and fallback so existing content keeps working.
2. Static UI strings live in frontend translation dictionaries.
3. Database content must use explicit translations; do not duplicate content columns per language.
4. Arabic requires RTL-aware layout work; do not blindly reverse the entire UI.
5. Public multilingual support is implemented before translating the Admin interface.
6. Dynamic API content will eventually receive the requested language through an explicit API language contract.
