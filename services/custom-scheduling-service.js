import { getDb, saveDb } from './rss-service.js';
import { getAutomationConfig, updateAutomationConfig } from './post-queue-service.js';
import { addHours, setHours, setMinutes, getDay, isAfter, isBefore, parseISO } from 'date-fns';

// Default custom schedule (business hours, weekdays only)
const DEFAULT_CUSTOM_SCHEDULE = {
  monday: ['09:00', '15:00', '21:00'],
  tuesday: ['09:00', '15:00', '21:00'],
  wednesday: ['09:00', '15:00', '21:00'],
  thursday: ['09:00', '15:00', '21:00'],
  friday: ['09:00', '15:00'],
  saturday: [],
  sunday: []
};

// Get current schedule configuration
export async function getScheduleConfig() {
  const config = await getAutomationConfig();
  
  return {
    scheduleType: config.scheduleType || 'interval',
    postingInterval: config.postingInterval || 6,
    customSchedule: config.customSchedule || DEFAULT_CUSTOM_SCHEDULE,
    timezone: config.timezone || 'America/New_York',
    pauseOnWeekends: config.pauseOnWeekends !== undefined ? config.pauseOnWeekends : false
  };
}

// Update schedule configuration
export async function updateScheduleConfig(newConfig) {
  const currentConfig = await getAutomationConfig();
  
  const updatedConfig = {
    ...currentConfig,
    scheduleType: newConfig.scheduleType || currentConfig.scheduleType,
    postingInterval: newConfig.postingInterval || currentConfig.postingInterval,
    customSchedule: newConfig.customSchedule || currentConfig.customSchedule,
    timezone: newConfig.timezone || currentConfig.timezone,
    pauseOnWeekends: newConfig.pauseOnWeekends !== undefined 
      ? newConfig.pauseOnWeekends 
      : currentConfig.pauseOnWeekends
  };

  await updateAutomationConfig(updatedConfig);
  console.log('✅ Schedule configuration updated');
  return updatedConfig;
}

// Calculate next post time based on schedule type
export function calculateNextPostTime(config) {
  const scheduleConfig = config || {};
  const scheduleType = scheduleConfig.scheduleType || 'interval';

  if (scheduleType === 'interval') {
    return calculateIntervalPostTime(scheduleConfig.postingInterval || 6);
  } else {
    return calculateCustomPostTime(scheduleConfig);
  }
}

// Calculate next post time for interval-based scheduling
function calculateIntervalPostTime(intervalHours) {
  return addHours(new Date(), intervalHours).toISOString();
}

// Calculate next post time for custom scheduling
function calculateCustomPostTime(config, _overrideNow) {
  const now = _overrideNow || new Date();
  const customSchedule = config.customSchedule || DEFAULT_CUSTOM_SCHEDULE;
  const pauseOnWeekends = config.pauseOnWeekends || false;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let currentDay = getDay(now);
  let daysChecked = 0;

  // Check up to 7 days ahead
  while (daysChecked < 7) {
    const dayName = dayNames[currentDay];
    const timesForDay = customSchedule[dayName] || [];

    // Skip weekends if configured
    if (pauseOnWeekends && (currentDay === 0 || currentDay === 6)) {
      currentDay = (currentDay + 1) % 7;
      daysChecked++;
      continue;
    }

    // Check each time slot for this day
    for (const timeStr of timesForDay) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      let candidateTime = setMinutes(setHours(now, hours), minutes);

      // If checking current day, skip times that have already passed
      if (daysChecked === 0 && isBefore(candidateTime, now)) {
        continue;
      }

      // Add days if not checking current day
      if (daysChecked > 0) {
        candidateTime = new Date(candidateTime);
        candidateTime.setDate(candidateTime.getDate() + daysChecked);
      }

      return candidateTime.toISOString();
    }

    // Move to next day
    currentDay = (currentDay + 1) % 7;
    daysChecked++;
  }

  // Fallback to interval-based if no custom times found
  console.warn('⚠️  No custom schedule times found, falling back to interval');
  return calculateIntervalPostTime(6);
}

// Get upcoming scheduled times (preview)
export async function getUpcomingScheduledTimes(count = 10) {
  const config = await getScheduleConfig();
  const times = [];
  let nextTime = calculateNextPostTime(config);

  for (let i = 0; i < count; i++) {
    times.push({
      scheduledFor: nextTime,
      dayOfWeek: new Date(nextTime).toLocaleDateString('en-US', { weekday: 'long' }),
      time: new Date(nextTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    });

    // Calculate next time after this one
    const tempConfig = { ...config };
    if (config.scheduleType === 'custom') {
      // For custom schedule, we need to find the next time after the current one
      const currentTime = new Date(nextTime);
      currentTime.setMinutes(currentTime.getMinutes() + 1); // Move 1 minute forward
      nextTime = calculateCustomPostTime({
        ...config,
        // Override now with the next minute after current scheduled time
        _overrideNow: currentTime
      });
    } else {
      nextTime = addHours(new Date(nextTime), config.postingInterval).toISOString();
    }
  }

  return times;
}

// Validate custom schedule
export function validateCustomSchedule(schedule) {
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const errors = [];

  for (const day of dayNames) {
    if (!schedule[day]) {
      errors.push(`Missing schedule for ${day}`);
      continue;
    }

    if (!Array.isArray(schedule[day])) {
      errors.push(`Schedule for ${day} must be an array`);
      continue;
    }

    for (const time of schedule[day]) {
      if (!/^\d{2}:\d{2}$/.test(time)) {
        errors.push(`Invalid time format for ${day}: ${time} (expected HH:MM)`);
      }

      const [hours, minutes] = time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        errors.push(`Invalid time value for ${day}: ${time}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Quick schedule presets
export const SCHEDULE_PRESETS = {
  'business-hours': {
    name: 'Business Hours (9-5, Weekdays)',
    schedule: {
      monday: ['09:00', '12:00', '17:00'],
      tuesday: ['09:00', '12:00', '17:00'],
      wednesday: ['09:00', '12:00', '17:00'],
      thursday: ['09:00', '12:00', '17:00'],
      friday: ['09:00', '12:00', '17:00'],
      saturday: [],
      sunday: []
    },
    pauseOnWeekends: true
  },
  '24-7': {
    name: '24/7 (Every 6 hours)',
    schedule: {
      monday: ['00:00', '06:00', '12:00', '18:00'],
      tuesday: ['00:00', '06:00', '12:00', '18:00'],
      wednesday: ['00:00', '06:00', '12:00', '18:00'],
      thursday: ['00:00', '06:00', '12:00', '18:00'],
      friday: ['00:00', '06:00', '12:00', '18:00'],
      saturday: ['00:00', '06:00', '12:00', '18:00'],
      sunday: ['00:00', '06:00', '12:00', '18:00']
    },
    pauseOnWeekends: false
  },
  'morning-evening': {
    name: 'Morning & Evening (7am, 7pm)',
    schedule: {
      monday: ['07:00', '19:00'],
      tuesday: ['07:00', '19:00'],
      wednesday: ['07:00', '19:00'],
      thursday: ['07:00', '19:00'],
      friday: ['07:00', '19:00'],
      saturday: ['09:00', '19:00'],
      sunday: ['09:00', '19:00']
    },
    pauseOnWeekends: false
  },
  'peak-hours': {
    name: 'Peak Engagement (8am, 12pm, 5pm)',
    schedule: {
      monday: ['08:00', '12:00', '17:00'],
      tuesday: ['08:00', '12:00', '17:00'],
      wednesday: ['08:00', '12:00', '17:00'],
      thursday: ['08:00', '12:00', '17:00'],
      friday: ['08:00', '12:00', '17:00'],
      saturday: [],
      sunday: []
    },
    pauseOnWeekends: true
  }
};

// Apply a preset schedule
export async function applySchedulePreset(presetName) {
  const preset = SCHEDULE_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  const config = {
    scheduleType: 'custom',
    customSchedule: preset.schedule,
    pauseOnWeekends: preset.pauseOnWeekends
  };

  await updateScheduleConfig(config);
  console.log(`✅ Applied preset: ${preset.name}`);
  return config;
}

// Get schedule statistics
export async function getScheduleStats() {
  const config = await getScheduleConfig();
  const upcomingTimes = await getUpcomingScheduledTimes(20);

  // Calculate posts per day
  const postsPerDay = {};
  upcomingTimes.forEach(time => {
    const day = time.dayOfWeek;
    postsPerDay[day] = (postsPerDay[day] || 0) + 1;
  });

  // Calculate average posts per week
  const totalPosts = Object.values(postsPerDay).reduce((sum, count) => sum + count, 0);
  const avgPostsPerWeek = (totalPosts / 20) * 7; // Extrapolate from 20 samples

  return {
    scheduleType: config.scheduleType,
    postsPerDay,
    avgPostsPerWeek: Math.round(avgPostsPerWeek),
    nextPostTime: upcomingTimes[0],
    upcomingCount: upcomingTimes.length
  };
}
