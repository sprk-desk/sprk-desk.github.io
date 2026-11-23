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
- **Headphones**: Zero-dependency Web Audio API procedural soundscape mixer (8 layers + presets).
- **Bookshelf**: Knowledge Library with searchable guides, bookmarks, and resource sharing.
- **Cabinet Drawer**: Saved personal resources and unlocked customization inventory.
- **Framed Portrait**: Profile, Supabase authentication, and account settings.
- **Desk Computer**: Discover public study rooms and three-role study groups (Owner, Moderator, Member).
- **Desk Phone**: Friends, notifications, and read-only room visits.
- **Trophy**: Study Passport and milestone achievements.
- **Desk Plant**: 10 room themes, object skins, layout locking, and reduced-motion preferences.
- **Desk Lamp & Mug**: Direct in-room lamp toggle and cozy break chime.

## Local Testing
Serve the repository root with any static file server (or `npm run dev` on port 3000):
```bash
python3 -m http.server 3000
```
Run unit tests:
```bash
node --test js/utils/*.test.mjs
```

## Supabase Setup & GitHub Pages Deployment
See `supabase/README.md` for running `supabase/migrations/001_sprk_desk_schema.sql` and `supabase/seed.sql`, then update `config.js` with your Supabase Project URL and public Anon Key.
Push to GitHub and enable **Settings -> Pages -> Deploy from branch (`main` / root)**. All asset paths are relative (`./`) for project-subpath compatibility.
