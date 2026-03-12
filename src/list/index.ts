import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();

    try {
        await client.rpush('mylist', 'first');
        await client.rpush('mylist', 'second', 'third');

        const list1 = await client.lrange('mylist', 0, -1);
        console.log('List Length:', list1.length);
        console.log('List Elements:', list1);

        await client.lpush('mylist', 'zero');
        const list2 = await client.lrange('mylist', 0, -1);
        console.log('After LPUSH, List Elements:', list2);

        const firstElement = await client.lpop('mylist');
        console.log('LPOP Element:', firstElement);

        const list3 = await client.lrange('mylist', 0, -1);
        console.log('After LPOP, List Elements:', list3);

        const lastElement = await client.rpop('mylist');
        console.log('RPOP Element:', lastElement);

        const list4 = await client.lrange('mylist', 0, -1);
        console.log('After RPOP, List Elements:', list4);

        const multiItems = await client.lpop('mylist', 2); // 여러 개 한번에 제거 (Redis 6.2 이상)
        console.log('LPOP Multiple Elements:', multiItems);

        const finalList = await client.lrange('mylist', 0, -1);
        console.log('Final List Elements:', finalList);


        // Queue: RPUSH추가, LPOP제거 -> FIFO
        await client.del('task_queue');
        await client.rpush('task_queue', 'task1', 'task2', 'task3');

        const task1 = await client.lpop('task_queue');
        console.log('Processing:', task1);

        const task2 = await client.lpop('task_queue');
        console.log('Processing:', task2);

        const remainingTasks = await client.lrange('task_queue', 0, -1);
        console.log('Remaining Tasks in Queue:', remainingTasks);

        // Stack: LPUSH추가, LPOP제거 -> LIFO
        // TODO

        // Blocking POP
        await client.del('async_queue');

        setTimeout(async () => {
            await client.rpush('async_queue', 'async_task1');
            console.log('Added async_task1 to async_queue');
        }, 3000)

        const producerClient = createRedisClient();

        const result = await producerClient.blpop('async_queue', 5); // 블로킹 대기 5초
        if (result) {
            console.log('BLPOP Result:', result);
        } else {
            console.log('BLPOP timed out without receiving any item.');
        }

        disconnectRedisClient(producerClient);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();