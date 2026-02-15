import { getStaticSchedule } from './lib/firebase/server/queries';

async function readSchedule() {
  const schedule = await getStaticSchedule();
  console.log(JSON.stringify(schedule, null, 2));
}

readSchedule();
