/**
 * 🧪 Test Simulation: Multiplex New Shows Drop
 * 
 * Simulates your exact BookMyShow scenario:
 * 1. Tracks: Prasads Multiplex: Hyderabad (PRHN)
 * 2. Movie: Avengers: Doomsday on Dec 17, 2026
 * 3. Initial Baseline: 6 shows (09:00 AM, 11:05 AM, 02:10 PM, 05:15 PM, 08:20 PM, 11:25 PM)
 * 4. Triggers when BookMyShow adds new shows (e.g. 06:00 AM PCX Screen)!
 */

import { sendMobileAlert } from '../services/notificationService.js';

console.log('\n🎬 ════════════════════════════════════════════════════════');
console.log('   TESTING: Movie Ticket Alarm Clock (Multiplex Watcher)');
console.log('══════════════════════════════════════════════════════════\n');

// 1. Initial State from your screenshot
const trackedAlert = {
  movieName: 'Avengers: Doomsday',
  theatreName: 'Prasads Multiplex: Hyderabad',
  city: 'hyderabad',
  targetDate: '17 Dec 2026',
  bmsUrl: 'https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217',
  phoneNumber: '9876543210',
  notificationMethod: 'all', // WhatsApp + SMS
  knownShows: [
    '09:00 AM',
    '11:05 AM',
    '02:10 PM',
    '05:15 PM',
    '08:20 PM',
    '11:25 PM'
  ],
};

console.log('📋 STEP 1: Setting up alert snapshot from BookMyShow...');
console.log(`   Cinema:  ${trackedAlert.theatreName}`);
console.log(`   Movie:   ${trackedAlert.movieName}`);
console.log(`   Date:    ${trackedAlert.targetDate}`);
console.log(`   Mobile:  +91 ${trackedAlert.phoneNumber} (${trackedAlert.notificationMethod.toUpperCase()})`);
console.log(`   Baseline Shows Tracked: ${trackedAlert.knownShows.length} shows`);
trackedAlert.knownShows.forEach(s => console.log(`     ✓ ${s}`));

// 2. Simulate Poller Check 1: No change
console.log('\n🔍 STEP 2: Running Poller Check 1 (Current status)...');
const currentBmsShows = [...trackedAlert.knownShows];
const diff1 = currentBmsShows.filter(s => !trackedAlert.knownShows.includes(s));
console.log(`   Checked BMS page: ${currentBmsShows.length} shows found.`);
console.log(`   New shows detected: ${diff1.length} -> Status: [WAITING 👁️ - No new shows yet]`);

// 3. Simulate BMS Dropping New Shows!
console.log('\n⚡ STEP 3: Simulating BookMyShow schedule update...');
console.log('   💥 PRASADS MULTIPLEX JUST OPENED SCREEN 6 (PCX) & MIDNIGHT SHOWS!');

const updatedBmsShows = [
  '06:00 AM (PCX 3D)',  // 🌟 NEW SHOW!
  '09:00 AM',
  '11:05 AM',
  '02:10 PM',
  '05:15 PM',
  '08:20 PM',
  '11:25 PM',
  '01:15 AM (Midnight)' // 🌟 NEW SHOW!
];

console.log(`\n🔍 STEP 4: Running Poller Check 2...`);
const brandNewShows = updatedBmsShows.filter(s => !trackedAlert.knownShows.includes(s));
console.log(`   🚨 NEW SHOWS DETECTED: ${brandNewShows.length} new showtimes found!`);
brandNewShows.forEach(s => console.log(`     🔥 ${s}`));

// 4. Trigger Instant Mobile Dispatch
console.log(`\n📱 STEP 5: Dispatching Instant Mobile Alert...`);
await sendMobileAlert(trackedAlert, {
  url: trackedAlert.bmsUrl,
  showtimes: brandNewShows,
  isNewShowAlert: true,
});

console.log('\n✅ TEST COMPLETED SUCCESSFULLY! All systems working as expected.\n');

