// Compute the next fire time for a Taylor reminder, honoring user's IANA timezone.
// Uses Intl.DateTimeFormat to translate wall-clock time in `timezone` into a UTC instant.

type ComputeArgs = {
  recurrence: "once" | "daily" | "weekly" | "monthly";
  hour: number;
  minute: number;
  byday?: number[]; // 0=Sun ... 6=Sat
  date?: string; // YYYY-MM-DD for one-off
  timezone: string;
  from: Date;
};

// Returns the UTC ms for a given wall-clock (Y-M-D H:M) in timezone `tz`.
function wallClockToUtcMs(
  tz: string,
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): number {
  // Start with the naive UTC guess for the wall clock.
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Ask what that instant looks like in `tz`.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const seenUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  // Offset between what we wanted (guess as if UTC) and what the tz shows.
  const offset = seenUtc - guess;
  return guess - offset;
}

function wallClockPartsInTz(tz: string, at: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export function computeNextFireAt(args: ComputeArgs): Date {
  const { recurrence, hour, minute, byday, date, timezone, from } = args;

  if (recurrence === "once") {
    if (!date) throw new Error("`date` is required for one-off reminders");
    const [y, mo, d] = date.split("-").map(Number);
    if (!y || !mo || !d) throw new Error("Invalid date format, expected YYYY-MM-DD");
    return new Date(wallClockToUtcMs(timezone, y, mo, d, hour, minute));
  }

  const now = from.getTime();
  const local = wallClockPartsInTz(timezone, from);

  const candidate = (offsetDays: number) => {
    // Add offsetDays to local date, then convert back.
    const base = new Date(Date.UTC(local.year, local.month - 1, local.day));
    base.setUTCDate(base.getUTCDate() + offsetDays);
    return wallClockToUtcMs(
      timezone,
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      hour,
      minute,
    );
  };

  if (recurrence === "daily") {
    for (let i = 0; i < 2; i++) {
      const ms = candidate(i);
      if (ms > now) return new Date(ms);
    }
    return new Date(candidate(1));
  }

  if (recurrence === "weekly") {
    const days = byday && byday.length > 0 ? byday : [local.weekday];
    for (let i = 0; i < 14; i++) {
      const wd = (local.weekday + i) % 7;
      if (!days.includes(wd)) continue;
      const ms = candidate(i);
      if (ms > now) return new Date(ms);
    }
    throw new Error("Could not compute next weekly reminder");
  }

  // monthly: same day-of-month
  for (let i = 0; i < 2; i++) {
    const y = local.year;
    const m = local.month - 1 + i;
    const targetMonth = ((m % 12) + 12) % 12;
    const targetYear = y + Math.floor(m / 12);
    // Clamp day-of-month to last day of target month
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const day = Math.min(local.day, lastDay);
    const ms = wallClockToUtcMs(timezone, targetYear, targetMonth + 1, day, hour, minute);
    if (ms > now) return new Date(ms);
  }
  throw new Error("Could not compute next monthly reminder");
}

export function advanceReminder(r: {
  recurrence: string;
  timezone: string;
  hour: number | null;
  minute: number | null;
  byday: number[] | null;
  next_fire_at: string;
}): Date | null {
  if (r.recurrence === "once" || r.hour == null || r.minute == null) return null;
  const from = new Date(new Date(r.next_fire_at).getTime() + 60_000);
  return computeNextFireAt({
    recurrence: r.recurrence as "daily" | "weekly" | "monthly",
    hour: r.hour,
    minute: r.minute,
    byday: r.byday ?? [],
    timezone: r.timezone,
    from,
  });
}