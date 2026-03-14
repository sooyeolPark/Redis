import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();
    try {
        await client.flushdb();

        // 1. 기본적인 EVAL 사용

        const script = `
            local key = KEYS[1]
            local quantity = tonumber(ARGV[1])

            local current = tonumber(redis.call("GET", key))

            if current == nil then
                return -1
            end

            if current < quantity then
                return -1
            end

            local newStock = current - quantity
            redis.call("SET", key, newStock)

            return newStock
        `;

        await client.set('product:1001:stock', '100');
        console.log('Initial Stock:', await client.get('product:1001:stock'));

        // EVAL : script, keyCount, ...key, ...args
        const result1 = client.eval(script, 1, 'product:1001:stock', '30');
        console.log('Stock after purchasing 30:', await result1);

        const result2 = client.eval(script, 1, 'product:1001:stock', '50');
        console.log('Attempt to purchase 50:', await result2);

        const result3 = client.eval(script, 1, 'product:1001:stock', '80');
        console.log('Attempt to purchase 80:', await result3);


        console.log('EVALSHA Example');

        const sha1 = await client.script('LOAD', script) as string;
        console.log('Loaded Script SHA1:', sha1);

        await client.set('product:1001:stock', '100');

        const result4 = client.evalsha(sha1, 1, 'product:1001:stock', '40');
        console.log('Stock after purchasing 40 using EVALSHA:', await result4);

        const result5 = client.evalsha(sha1, 1, 'product:1001:stock', '40');
        console.log('Attempt to purchase 40 using EVALSHA:', await result5);

        const result6 = client.evalsha(sha1, 1, 'product:1001:stock', '40');
        console.log('Attempt to purchase 40 using EVALSHA:', await result6);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();