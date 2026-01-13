# Team Manager Bot

A Telegram bot for managing team schedules, availability polling, and match coordination. Developed for my Pappaliiga Counter-Strike team.

Cursor AI auto-completion and Claude Code AI agent have been used to develop this bot.

## Features

- **Season Management**: Start/end seasons, track multiple seasons
- **Roster Management**: Add/remove players, view team roster
- **Availability Polling**: Weekly polls for player availability with time slots
- **Match Scheduling**: Set match times, manage lineups
- **Automated Reminders**: Scheduled weekly polls and mid-week reminders
- **Public Group Support**: Optional public group with restricted commands and auto-announcements
- **Multi-language**: Finnish and English support

## Prerequisites

- Node.js 20+
- pnpm 10+

## Development Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd team-manager-telegram-bot
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file with required environment variables:
```env
# Required
BOT_TOKEN=your_telegram_bot_token
TEAM_GROUP_ID=-1001234567890
ADMIN_IDS=123456789,987654321

# Optional
PUBLIC_GROUP_ID=-1001234567890
DEFAULT_LANGUAGE=fi
TZ=Europe/Helsinki
DB_PATH=./data/bot.db

# Poll defaults
DEFAULT_POLL_DAY=sun
DEFAULT_POLL_TIME=10:00
DEFAULT_POLL_DAYS=mon,tue,wed,thu,fri,sat,sun
DEFAULT_POLL_TIMES=19,20,21

# Poll reminder defaults
DEFAULT_POLL_REMINDER_DAY=wed
DEFAULT_POLL_REMINDER_TIME=18:00
DEFAULT_POLL_REMINDER_MODE=quiet

# Match defaults
DEFAULT_MATCH_DAY=sun
DEFAULT_MATCH_TIME=20:00
DEFAULT_MATCH_DAY_REMINDER_MODE=quiet
DEFAULT_MATCH_DAY_REMINDER_TIME=18:00
DEFAULT_LINEUP_SIZE=5
```

4. Run database migrations:
```bash
pnpm db:migrate
```

5. Start the bot in development mode:
```bash
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start bot in watch mode |
| `pnpm start` | Start bot for production |
| `pnpm db:migrate` | Run database migrations |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Check linting |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm typecheck` | Check TypeScript types |

## Bot Commands

The bot uses a hierarchical permission system: **Admin > Captain > Player > Public**

### Public Group Restrictions

When `PUBLIC_GROUP_ID` is configured, the bot can operate in two groups:
- **Team Group** (`TEAM_GROUP_ID`): Full functionality for all commands
- **Public Group** (`PUBLIC_GROUP_ID`): Limited to public commands only

In the public group:
- **Public commands** work for everyone (`/help`, `/roster`, `/nextmatch`)
- **Player/Captain commands** return "Command not available in public group"
- **Admin commands** work normally (admins bypass the restriction)

This allows friends/spectators to view match info without accessing team management features.

### Public Commands
Available to everyone:
- `/help` - Show command list
- `/roster` - View team roster
- `/nextmatch` - View upcoming match info

### Player Commands
Available to roster members, captains, and admins:
- `/avail` - View all player availability
- `/avail practice` - View practice availability only
- `/avail match` - View match availability only
- `/avail today` - View today's availability
- `/avail <day>` - View specific day (mon, tue, wed, etc.)
- `/avail practice mon` - Combine filters
- `/poll` - View/respond to availability poll for target week
- `/poll <week>` - Poll for specific future week (e.g., `/poll 5`)
- `/status` - View status overview

### Captain Commands
Available to captains and admins:
- `/setweek <week> practice|match` - Set week type
- `/setmatch <day> <time>` - Schedule a match
- `/setlineup @users...` - Set match lineup
- `/remind` - Send reminder to non-responders

### Admin Commands
- `/startseason <name>` - Start a new season
- `/endseason` - End current season
- `/season` - View season info
- `/config [key] [value]` - View/edit settings
- `/addplayer <username>` - Invite player to roster (see below)
- `/removeplayer @user` - Remove player from roster
- `/promote @user` - Promote player to captain
- `/demote @user` - Demote captain to player

### Adding Players

Due to Telegram API limitations, the bot cannot directly add players by username—Telegram doesn't provide user IDs from @mentions. Instead, `/addplayer` uses an invitation flow:

**For users with a username:**
1. Admin types `/addplayer username` (without @, to avoid pinging)
2. Bot posts an invitation message with 👍/👎 reactions
3. The mentioned user reacts 👍 to accept or 👎 to decline
4. Bot verifies the reactor's username matches and adds them to roster

**For users without a username:**
1. Admin taps on the user's name in any message (creates a text_mention)
2. Admin types `/addplayer` in the reply
3. Bot posts an invitation with reaction buttons
4. User reacts to accept/decline

This approach ensures only the actual user can accept roster invitations.

## Configuration Options

Use `/config` to view all settings. Available options:

| Key | Description | Example |
|-----|-------------|---------|
| `language` | Bot language (fi/en) | `fi` |
| `poll_day` | Day to send poll | `sun` |
| `poll_time` | Time to send poll | `10:00` |
| `poll_days` | Days shown in poll | `mon,tue,wed,thu,fri,sat,sun` |
| `poll_times` | Time slots in poll | `19,20,21` |
| `poll_cutoff_day` | Day for week cutoff | `thu` |
| `poll_cutoff_time` | Time for week cutoff | `10:00` |
| `reminder_day` | Day for reminders | `wed` |
| `reminder_time` | Time for reminders | `18:00` |
| `reminders_mode` | ping/quiet/off | `quiet` |
| `match_day` | Default match day | `sun` |
| `match_time` | Default match time | `20:00` |
| `lineup_size` | Players in lineup | `5` |
| `match_day_reminder_mode` | Match day reminder (ping/quiet/off) | `quiet` |
| `match_day_reminder_time` | Time for match day reminder | `18:00` |
| `public_announcements` | Auto-announce to public group (on/off) | `on` |

**Poll Cutoff Logic**: After the cutoff (default: Thursday 10:00), polls and reminders automatically target the next week. This ensures that when you send the Sunday poll, it asks about next week's availability (for the upcoming match), not the current week.

## Project Structure

```
src/
├── bot/                    # Bot setup and commands
│   ├── commands/          # Command handlers
│   │   ├── admin/        # Admin commands
│   │   └── player/       # Player commands
│   ├── context.ts        # BotContext type
│   └── middleware/       # Auth and context middleware
├── db/                    # Database setup
│   └── migrations/       # SQL migrations
├── i18n/                  # Translations
├── lib/                   # Utility functions
├── menus/                 # Interactive menus
├── scheduler/             # Cron job handlers
├── services/              # Business logic
└── types/                 # TypeScript types
```

## License

Private
