# SPRK Desk — A Little World for Big Dreams

An interactive, customizable 2D virtual study room built with semantic HTML5, modular CSS3, and native vanilla JavaScript ES6+ modules—deployable as a static site on GitHub Pages with no required bundler.

## Room Object Map
- **Window**: Time of day (Auto, Morning, Afternoon, Sunset, Night), weather effects, and layered lighting sliders.
- **Visiting Merchant Bird**: Desk Shop, Study Credit wallet, earning rules, and transaction ledger.
- **Wall Clock**: Focus & Pomodoro timer with timestamp-based recovery across reloads.
- **Hourglass**: Study Register & manual descriptive study logs (0 SC).
- **Wall Calendar**: Monthly study calendar, streaks, and subject breakdown statistics.
- **Pinboard**: Sticky-note tasks, priorities, deadlines, and daily goals.
- **Notebook**: Owner-only private diary and personal study notes.
- **Headphones**: Zero-dependency Web Audio API procedural soundscape mixer with curated tracks and 6 purchasable ambient loop discs (Soft Rain, Forest Canopy, Quiet Study Cafe, Cozy Fireplace, Ocean Surf, Library Hum).
- **Bookshelf**: Knowledge Library with searchable guides, bookmarks, and resource sharing.
- **Cabinet Drawer**: Saved personal resources, JSON backup/restore, and unlocked customization inventory.
- **Framed Portrait**: Profile editor, Supabase authentication, avatar customization, and account settings.
- **Desk Computer**: Discover public study rooms and three-role study groups (Owner, Moderator, Member).
- **Desk Phone & Live Study Circle**: Friends, notifications, read-only room visits, and a toggleable in-room Live Study Circle visual overlay showing friends currently studying.
- **Trophy**: Study Passport and milestone achievements.
- **Control Panel**: Serious Mode (monochrome Swiss Editorial & Obsidian Minimal themes unlocked free, clean UI discipline), Strict Focus Lock, Workspace Profiles, and quick toggles (`Ctrl/Cmd + K` Command Palette).
- **Desk Plant**: 16 room themes (including Swiss Editorial and Obsidian Minimal), object skins, layout locking, and reduced-motion preferences.
- **Desk Lamp & Mug**: Direct in-room lamp toggle and cozy break chime.
- **DeepFocus Mode (Top-Left Mode Switcher)**: Switch cleanly between **Cozy Study** and **DeepFocus** — a distraction-free dark glassmorphic workspace with Pomodoro/Timer/Stopwatch modes, 5 atmospheric scene backdrops (with custom image URL & blur/brightness/contrast/saturation tuning), 16-theme palette adaptation, live speed/opacity/density canvas particle engine (with 5 purchasable Shop particle packs), Kanban tasks drawer, 28-day heatmap analytics, floating Sound Mixer dock, and live friends studying together.

## Local Testing
Serve the repository root locally (or run `npm run dev` on port 3000):
```bash
python3 -m http.server 3000
```
Run unit tests:
```bash
npx --yes tsx --test js/utils/*.test.mjs
```

## Supabase Setup & GitHub Pages Deployment
See `supabase/README.md` for database setup if configuring your own Supabase backend, then update `config.js` with your Supabase Project URL and public Anon Key.
Push to GitHub and enable **Settings -> Pages -> Deploy from branch (`main` / root)**. All asset paths (including `./assets/icon.svg`) are relative (`./`) for project-subpath compatibility.
