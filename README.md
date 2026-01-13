# Pappaliiga Bot

A Telegram bot for managing team schedules, availability polling, and match coordination.

## Features

- **Season Management**: Start/end seasons, track multiple seasons
- **Roster Management**: Add/remove players, view team roster
- **Availability Polling**: Weekly polls for player availability with time slots
- **Match Scheduling**: Set match times, manage lineups
- **Automated Reminders**: Scheduled weekly polls and mid-week reminders
- **Public Announcements**: Auto-announce lineup and match changes to a public channel
- **Multi-language**: Finnish and English support

## Prerequisites

- Node.js 20+
- pnpm 10+

## Development Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd pappaliigabot
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
PUBLIC_CHANNEL_ID=-1001234567890
DEFAULT_LANGUAGE=fi
TZ=Europe/Helsinki
DB_PATH=./data/bot.db

# Poll defaults
DEFAULT_POLL_DAY=sun
DEFAULT_POLL_TIME=10:00
DEFAULT_POLL_DAYS=mon,tue,wed,thu,fri,sat,sun
DEFAULT_POLL_TIMES=19,20,21

# Reminder defaults
DEFAULT_REMINDER_DAY=wed
DEFAULT_REMINDER_TIME=18:00
DEFAULT_REMINDERS_MODE=quiet

# Match defaults
DEFAULT_MATCH_DAY=sun
DEFAULT_MATCH_TIME=20:00
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

### Public Commands
Available to everyone:
- `/roster` - View team roster
- `/nextmatch` - View upcoming match info
- `/help` - Show command list

### Player Commands
Available to roster members only:
- `/match` - View match info and lineup
- `/practice [day]` - View practice availability

### Admin Commands
- `/startseason <name>` - Start a new season
- `/endseason` - End current season
- `/season` - View season info
- `/config [key] [value]` - View/edit settings
- `/addplayer @user` - Add player to roster
- `/removeplayer @user` - Remove player from roster
- `/setweek <week> practice|match` - Set week type
- `/setmatch <day> <time>` - Schedule a match
- `/setlineup @users...` - Set match lineup
- `/poll` - Send availability poll
- `/remind` - Send reminder to non-responders
- `/status` - View status overview

## Configuration Options

Use `/config` to view all settings. Available options:

| Key | Description | Example |
|-----|-------------|---------|
| `language` | Bot language (fi/en) | `fi` |
| `poll_day` | Day to send poll | `sun` |
| `poll_time` | Time to send poll | `10:00` |
| `poll_days` | Days shown in poll | `mon,tue,wed,thu,fri,sat,sun` |
| `poll_times` | Time slots in poll | `19,20,21` |
| `reminder_day` | Day for reminders | `wed` |
| `reminder_time` | Time for reminders | `18:00` |
| `reminders_mode` | ping/quiet/off | `quiet` |
| `match_day` | Default match day | `sun` |
| `match_time` | Default match time | `20:00` |
| `lineup_size` | Players in lineup | `5` |
| `match_day_reminder_enabled` | Enable match day reminder | `on` |
| `match_day_reminder_time` | Time for match day reminder | `18:00` |

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
