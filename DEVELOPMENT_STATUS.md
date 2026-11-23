# SPRK Desk — Development Status

## Completed Architecture & Modules
- **Core Room & Object System (`objects/*.js`)**: Inherited `GameObject` architecture with 21 mapped room elements (`Room`, `WindowObject`, `Bird`, `Bookcase`, `Desk`, `Clock`, `Hourglass`, `Plant`, `Calendar`, `Trophy`, `Mascot`, `Bookshelf`, `PhotoFrame`, `Pinboard`, `Drawer`, `Computer`, `Phone`, `Notebook`, `Headphones`, `Lamp`, `CoffeeMug`).
- **Customization & Lighting (`js/core/`)**: 10 complete room themes (`css/themes/themes.css`), object skin registry (`skin-manager.js`), multi-layered environmental lighting + canvas weather engine (`lighting-manager.js`), pointer-events drag-and-drop with bounds clamping & layout locking (`layout-manager.js`).
- **Object-Specific Dialog Engine (`js/core/dialog-manager.js`)**: Distinct visual framing per room object with Escape/backdrop close, focus restoration, ARIA labelling, and hash routing (`js/router.js`).
- **Productivity & Procedural Audio**: Timestamp-accurate focus timer with reload recovery (`focus.js`, `timer-math.js`), manual study register (`register.js`), monthly calendar & streak analytics (`calendar.js`), sticky-note tasks & goals (`tasks.js`), owner-only diary (`diary.js`), and 8-channel Web Audio soundscape synthesizer (`audio-manager.js`, `audio.js`).
- **Supabase Backend & Economy (`supabase/migrations/001_sprk_desk_schema.sql`)**: Full relational schema, strict RLS policies, Storage buckets, and `SECURITY DEFINER` atomic RPCs (`complete_focus_session`, `purchase_catalog_item`, `create_study_group`, `admin_grant_entitlement`).

## Live Local Features vs Server-Gated Features
- **Live Immediately (Browser-Local Studio Mode)**: All 10 room themes, object skins, day/night/weather/lighting controls, drag-and-drop placement, focus timer, study register, calendar & streaks, pinboard tasks, private diary, Web Audio mixer, and local resource bookmarking.
- **Requires Configured Supabase Project (`config.js`)**: Cloud email authentication, server-authoritative Study Credit minting & Desk Shop purchases, friend requests, direct messaging, live study rooms/groups, file uploads, and audited admin operations. Unconfigured instances display honest setup guidance without fabricating balances or purchases.
