import { generateWeeklyAssignments } from './src/utils/scheduleUtils';
import { JOBS, CALL_IN_CLEANERS, CLEANER_ORDER, STAFF_CLEANERS } from './src/constants/consts';

const present = { wed: [...STAFF_CLEANERS.filter((cleaner) => cleaner !== 'PW' && cleaner !== 'D'), 'JK'] };
const weekly1 = generateWeeklyAssignments(CLEANER_ORDER, new Date(2026, 2, 4), JOBS.length, present, JOBS, CALL_IN_CLEANERS);
const weekly2 = generateWeeklyAssignments(CLEANER_ORDER, new Date(2026, 2, 4), JOBS.length, present, JOBS, CALL_IN_CLEANERS, { wed: { JK: 'D' } });
console.log('weekly1', JSON.stringify(weekly1.wed));
console.log('weekly2', JSON.stringify(weekly2.wed));
console.log('gar1', weekly1.wed[JOBS.indexOf('Gar')]);
console.log('vac1', weekly1.wed[JOBS.indexOf('Vac')]);
console.log('gar2', weekly2.wed[JOBS.indexOf('Gar')]);
console.log('vac2', weekly2.wed[JOBS.indexOf('Vac')]);
