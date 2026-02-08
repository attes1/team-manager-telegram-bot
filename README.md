# Team Manager Bot

A Telegram bot for managing team schedules, availability polling, and match coordination. Developed for my Pappaliiga Counter-Strike team.

Cursor AI auto-completion and Claude Code AI agent have been used to develop this bot.

## Future plans and ideas

- Add support for multiple teams (bot as a service)
- Automation through faceit integration
- Possible other integrations (discord, calendar, etc.)

## Features

- **Season Management**: Start/end seasons, track multiple seasons
- **Roster Management**: Add/remove players, view team roster
- **Availability Polling**: Weekly polls for player availability with time slots
- **Match Scheduling**: Set match times, manage lineups
- **Automated Reminders**: Scheduled weekly polls and mid-week reminders
- **Group Auto-Discovery**: Automatically registers groups when bot is invited, with configurable types (team/public)
- **Menu Lifecycle Management**: Auto-delete old menus when new ones are created, daily cleanup of expired menus
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
ADMIN_IDS=123456789,987654321

# Optional
DEV_MODE=false
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

# Public group defaults
DEFAULT_PUBLIC_ANNOUNCEMENTS=off
DEFAULT_PUBLIC_COMMANDS_MODE=admins

# Menu lifecycle
DEFAULT_MENU_EXPIRATION_HOURS=24
DEFAULT_MENU_CLEANUP_TIME=04:00
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

### Group Auto-Discovery

The bot automatically registers groups when invited. Groups can be either "team" or "public" type:

**Setup:**
1. Invite the bot to your group(s)
2. Use `/setgrouptype team` in your main team group
3. Other groups default to "public" type

**Group Types:**
- **Team Group**: Full functionality - polls, reminders, and all commands sent here. Only one group can be "team" at a time.
- **Public Groups**: Limited to public commands only. Receives match/lineup announcements when `public_announcements` is enabled.

**Restrictions in Public Groups:**
- **Public commands** work for everyone (`/help`, `/roster`, `/nextmatch`)
- **Player/Captain commands** return "Command not available in public group"
- **Admin commands** work normally (admins bypass the restriction)

This allows friends/spectators to view match info without accessing team management features.

### Public Commands
Available to everyone:
- `/help` - Show command list
- `/roster` - View team roster
- `/nextmatch` - View upcoming match info (opponent, time, lineup)

### Player Commands
Available to roster members, captains, and admins:
- `/avail` - View all player availability
- `/avail practice` - View practice availability only
- `/avail match` - View match availability only
- `/avail today` - View today's availability
- `/avail <day>` - View specific day (mon, tue, wed, etc.)
- `/avail <day>/<week>` - View specific day for specific week (e.g., `/avail tue/5`)
- `/avail <day>/<week>/<year>` - View specific day with explicit year (e.g., `/avail tue/5/2026`)
- `/avail practice mon` - Combine filters
- `/poll` - View/respond to availability poll for target week
- `/poll <week>` - Poll for specific week (e.g., `/poll 5`)
- `/poll <week>/<year>` - Poll with explicit year (e.g., `/poll 5/2026`)
- `/status` - View status overview

### Captain Commands
Available to captains and admins:
- `/setweek [week[/year]] practice|match` - Set week type (e.g., `/setweek 5 practice` or `/setweek 5/2026 match`)
- `/setmatch <day[/week[/year]]> <time>` - Schedule a match (e.g., `/setmatch sun 20:00` or `/setmatch sun/5 20:00`)
- `/setlineup @users... [week[/year]]` - Set match lineup (e.g., `/setlineup @user1 @user2 5` or `/setlineup @user1 5/2026`)
- `/setopponent <name> [url] [week[/year]]` - Set opponent name and optional team profile link (e.g., `/setopponent Team Name 5`)
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
- `/setgrouptype <public|team>` - Set group type (auto-discovered groups default to public)

### Adding Players

Due to Telegram API limitations, the bot cannot directly add players by username—Telegram doesn't provide user IDs from @mentions. Instead, `/addplayer` uses a deep link invitation flow:

**For users with a username:**
1. Admin types `/addplayer username` (without @, to avoid pinging)
2. Bot posts an invitation message with an "Accept" button (deep link to bot DM)
3. The mentioned user clicks the button and is taken to the bot's DM
4. Bot verifies the user's identity and adds them to the roster

**For users without a username:**
1. Admin taps on the user's name in any message (creates a text_mention)
2. Admin types `/addplayer` in the reply
3. Bot posts an invitation with an "Accept" deep link button
4. User clicks the button and is added via the bot's DM

This approach ensures only the actual user can accept roster invitations. The deep link triggers `/start` in the bot's DM with an invite payload, which the bot uses to match the invitation and complete the roster addition.

## Configuration Options

Use `/config` to view all settings. Available options:

| Key | Description | Example |
|-----|-------------|---------|
| `language` | Bot language (fi/en) | `fi` |
| `poll_day` | Day to send poll | `sun` |
| `poll_time` | Time to send poll | `10:00` |
| `poll_days` | Days shown in poll | `mon,tue,wed,thu,fri,sat,sun` |
| `poll_times` | Time slots in poll | `19,20,21` |
| `week_change_day` | Day for week change | `sun` |
| `week_change_time` | Time for week change | `10:00` |
| `reminder_day` | Day for reminders | `wed` |
| `reminder_time` | Time for reminders | `18:00` |
| `reminders_mode` | ping/quiet/off | `quiet` |
| `match_day` | Default match day | `sun` |
| `match_time` | Default match time | `20:00` |
| `lineup_size` | Players in lineup | `5` |
| `match_day_reminder_mode` | Match day reminder (ping/quiet/off) | `quiet` |
| `match_day_reminder_time` | Time for match day reminder | `18:00` |
| `public_announcements` | Auto-announce to public group (on/off) | `on` |
| `public_commands_mode` | Who can use commands in public groups (all/admins) | `all` |
| `menu_expiration_hours` | Hours before menus are cleaned up (1-168) | `24` |
| `menu_cleanup_time` | Time to run daily menu cleanup | `04:00` |

**Week Change Logic**: After the week change (default: Sunday 10:00), polls and scheduling automatically target the next week. This ensures that when you send the Sunday poll, it asks about next week's availability (for the upcoming match), not the current week.

## Development Mode

Set `DEV_MODE=true` in your `.env` file to enable development features:

**Status Command Enhancements:**
- Shows `[DEVELOPMENT]` badge in status output
- Displays scheduler information (poll, reminder, match day reminder schedules)

**Developer Commands (admin-only):**
- `/devpoll [minutes]` - Reschedule poll to run in X minutes (default: 1)
- `/devreminder [minutes]` - Reschedule reminder to run in X minutes
- `/devmatchreminder [minutes]` - Reschedule match day reminder to run in X minutes
- `/devtrigger <poll|reminder|matchreminder>` - Immediately trigger a scheduler task
- `/devschedule` - Show all scheduled tasks

These commands are hidden from `/help` when not in development mode.

## Project Structure

```
src/
├── bot/                    # Bot setup and commands
│   ├── commands/          # Command handlers
│   │   ├── admin/        # Admin commands (season, config, players)
│   │   ├── dev/          # Development commands (scheduler testing)
│   │   ├── public/       # Public commands (help, roster, nextmatch)
│   │   └── user/         # User commands (avail, poll, status, etc.)
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
