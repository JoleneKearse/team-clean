import { enforceNecessaryJobsBeforeFlo, generateWeeklyAssignments } from './src/utils/scheduleUtils';
import { JOBS, CALL_IN_CLEANERS, CLEANER_ORDER, STAFF_CLEANERS } from './src/constants/consts';

const BASE = ['PW', 'JA', 'BM', 'AN', 'RB', 'D', 'TW', 'JK'];
const withEmpty = (slots: number[]) => BASE.map((initials, i) => (slots.includes(i) ? '' : initials));
const resultByJob = (assignments: string[]) => Object.fromEntries(JOBS.map((jobId, i) => [jobId, assignments[i] ?? '']));

for (const slots of [[6],[3],[1],[1,3],[0]]) {
  const input = withEmpty(slots);
  const result = resultByJob(enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }));
  console.log('slots', slots, JSON.stringify(result));
}
const weekly = generateWeeklyAssignments(CLEANER_ORDER, new Date(2026,10,2), JOBS.length, undefined, JOBS, CALL_IN_CLEANERS);
console.log('mon', JSON.stringify(weekly.mon));
console.log('tue', JSON.stringify(weekly.tue));
console.log('wed-callin', JSON.stringify(generateWeeklyAssignments(CLEANER_ORDER, new Date(2026,10,2), JOBS.length, {
  wed: [...STAFF_CLEANERS.filter((cleaner) => cleaner !== 'PW' && cleaner !== 'D'), 'JK']
}, JOBS, CALL_IN_CLEANERS).wed));
console.log('wed-callin-mapped', JSON.stringify(generateWeeklyAssignments(CLEANER_ORDER, new Date(2026,10,2), JOBS.length, {
  wed: [...STAFF_CLEANERS.filter((cleaner) => cleaner !== 'PW' && cleaner !== 'D'), 'JK']
}, JOBS, CALL_IN_CLEANERS, { wed: { JK: 'D' } }).wed));
