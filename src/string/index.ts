import { createRedisClient, disconnectRedisClient } from '../connection';

async function main() {
  const client = createRedisClient();

  try {

    // Set a string value
    await client.set('user:100:name', 'John Doe');
    const name = await client.get('user:100:name');
    console.log('User name:', name);

    // Update a string value
    await client.set('user:100:name', 'Smith');
    const updatedName = await client.get('user:100:name');
    console.log('Updated user name:', updatedName);

    // get non-existent value
    const none = await client.get('user:1000:name');
    console.log('Non-existing user name:', none);

    // incr
    await client.incr('page_views');
    await client.incr('page_views');
    await client.incr('page_views');
    

    const pageViews = await client.get('page_views');
    console.log('Page views:', pageViews);

    await client.incrby('page_views', 10);
    const incrbyPageViews = await client.get('page_views');
    console.log('Page views after incrby:', incrbyPageViews);

    await client.decrby('page_views', 5);
    const decrbyPageViews = await client.get('page_views');
    console.log('Page views after decrby:', decrbyPageViews);
    
    await client.mset(
        'user:101:name', 'Park',
        'user:101:email', 'park@example.com',
    );

    const values = await client.mget('user:101:name', 'user:101:email');
    console.log('MGET values:', values);

    await client.set('sessiont:abc', 'abtic', 'EX', 300);
    const sessionTtl = await client.ttl('sessiont:abc');
    console.log('Session TTL:', sessionTtl);

    const firtst = await client.setnx('config:featureX', 'enabled');
    console.log('First setnx:', firtst);

    const second = await client.setnx('config:featureX', 'disabled');
    console.log('Second setnx:', second);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectRedisClient(client);
  }
}

main();