# Manual Testing Guide

This document provides a manual testing checklist with copy-pasteable commands to validate bot functionality.

## Prerequisites

1. Set up `.env` with:
   ```env
   BOT_TOKEN=your_bot_token
   ADMIN_IDS=your_telegram_id
   DEV_MODE=true
   ```

2. Run migrations and start the bot:
   ```bash
   pnpm db:migrate
   pnpm dev
   ```

3. Create a test group in Telegram and add the bot

## Testing Plan

### Phase 1: Initial Setup

**Set group as team group:**
```
/setgrouptype team
```
- Verify: Confirmation message appears

**Start a season:**
```
/startseason Test Season
```
- Verify: Season started confirmation

**View season info:**
```
/season
```
- Verify: Shows season name, status, start date

### Phase 2: Public Commands

**View help:**
```
/help
```
- Verify: Commands grouped by permission level, formatting looks clean

**View roster (empty):**
```
/roster
```
- Verify: Shows "Roster is empty" message

**Add yourself to roster:**
```
/addplayer yourusername
```
- Verify: Invitation message with reaction buttons appears
- React with 👍 to accept
- Verify: Confirmation that you were added

**View roster (with player):**
```
/roster
```
- Verify: Shows your name in the list

**View next match (no match set):**
```
/nextmatch
```
- Verify: Shows appropriate "no match" message

### Phase 3: Player Commands

**View availability poll:**
```
/poll
```
- Verify: Poll menu appears with days and time slots
- Click some time slots and status icons
- Verify: Icons update correctly

**View availability:**
```
/avail
```
- Verify: Shows your availability entries

**View availability for specific day:**
```
/avail today
/avail mon
```
- Verify: Filtered view shows correctly

**View status:**
```
/status
```
- Verify: Shows season, week, roster count, schedules
- If DEV_MODE=true: Shows [DEVELOPMENT] badge

### Phase 4: Captain Commands

**Promote yourself to captain:**
```
/promote @yourusername
```
- Verify: Promotion confirmation

**Set week type:**
```
/setweek practice
/setweek match
```
- Verify: Confirmation with week number and date range

**Set match time:**
```
/setmatch sun 20:00
```
- Verify: Match scheduled confirmation

**Set opponent:**
```
/setopponent Test Opponent
/setopponent Test Team https://example.com
```
- Verify: Opponent set confirmation, URL shown if provided

**View next match (with match set):**
```
/nextmatch
```
- Verify: Shows match day, time, opponent

**Open lineup menu:**
```
/setlineup
```
- Verify: Interactive menu with roster players appears
- Select players and click Done
- Verify: Lineup saved confirmation

**Send reminder:**
```
/remind
```
- Verify: Reminder message or "all responded" message

### Phase 5: Admin Commands

**View config:**
```
/config
```
- Verify: All settings listed with current values

**View specific config:**
```
/config language
```
- Verify: Shows current value and options

**Change config:**
```
/config language en
/config language fi
```
- Verify: Confirmation message, bot responds in new language

**Demote captain:**
```
/demote @yourusername
```
- Verify: Demotion confirmation

### Phase 6: Dev Commands (DEV_MODE=true only)

**View schedules:**
```
/devschedule
```
- Verify: Lists scheduled tasks

**Trigger poll immediately:**
```
/devtrigger poll
```
- Verify: Poll message sent to group

**Trigger reminder:**
```
/devtrigger reminder
```
- Verify: Reminder message sent

**Schedule poll to run soon:**
```
/devpoll 1
```
- Verify: Confirmation, poll runs in ~1 minute

### Phase 7: Cleanup

**End season:**
```
/endseason
```
- Verify: Season ended confirmation

## Visual Checks

For each command output, verify:
- Text is properly formatted (bold headers, bullet points)
- Emojis display correctly
- No HTML tags visible (should be rendered)
- Finnish/English translations match the configured language
- Date/time formats are readable

## Error Cases

Test these should show appropriate error messages:

```
/setmatch invalid 99:99
/config badkey value
/poll 99
/avail invalid
```
