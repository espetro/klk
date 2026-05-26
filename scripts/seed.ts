import { createHash } from 'crypto';
import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

const CITIES = [
  { slug: 'barcelona', label: 'Barcelona' },
  { slug: 'madrid', label: 'Madrid' },
  { slug: 'nyc', label: 'New York' },
  { slug: 'london', label: 'London' },
  { slug: 'berlin', label: 'Berlin' },
];

const RELAY_URL = 'ws://localhost:10547';

async function runSeed() {
  try {
    // Create fixed private key from deterministic seed
    const pkHex = createHash('sha256').update('klk-test-seed').digest('hex');
    const signer = new NDKPrivateKeySigner(pkHex);

    // Initialize NDK
    const ndk = new NDK({ explicitRelayUrls: [RELAY_URL] });
    ndk.signer = signer;

    // Connect to relay with 5 second timeout
    const connected = await Promise.race([
      ndk.connect(5000),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Relay connection timeout')), 5000)
      ),
    ]);

    if (!connected) {
      console.error('Failed to connect to relay at', RELAY_URL);
      process.exit(1);
    }

    // Publish 5 kind 31923 events
    console.log('Publishing events...');
    for (let i = 1; i <= 5; i++) {
      const city = CITIES[(i - 1) % CITIES.length];
      const startTs = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 * i; // 7 days from now + i
      const endTs = startTs + 2 * 60 * 60; // 2 hours duration

      const event = new NDKEvent(ndk, {
        kind: 31923,
        content: '',
        tags: [
          ['d', `event-${i}`],
          ['title', `Sample Event ${i}`],
          ['start', String(startTs)],
          ['end', String(endTs)],
          ['location', `${city.label}, Sample Venue`],
          ['summary', `This is a sample event in ${city.label} for testing.`],
          ['t', `city:${city.slug}`],
        ],
      });

      await event.sign(signer);
      await event.publish();
      console.log(`Published event: kind=${event.kind} id=${event.id}`);
    }

    // Publish 5 kind 30078 public circles
    console.log('Publishing circles...');
    for (let i = 1; i <= 5; i++) {
      const city = CITIES[(i - 1) % CITIES.length];

      const event = new NDKEvent(ndk, {
        kind: 30078,
        content: '',
        tags: [
          ['d', `circle-${i}`],
          ['name', `${city.label} Community`],
          ['description', `A public circle for ${city.label} residents.`],
          ['t', `city:${city.slug}`],
        ],
      });

      await event.sign(signer);
      await event.publish();
      console.log(`Published circle: kind=${event.kind} id=${event.id}`);
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
}

runSeed();
