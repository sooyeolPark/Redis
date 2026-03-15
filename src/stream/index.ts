import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();
    try {

        await client.del('orders')

        // 1. 기본 XADD / XREAD 사용법
        const id1 = await client.xadd('orders', '*', 'product', 'laptop', 'quantity', '1', 'price', '1500000');
        console.log('Added entry with ID:', id1);

        const id2 = await client.xadd('orders', '*', 'product', 'mouse', 'quantity', '2', 'price', '800000');
        console.log('Added entry with ID:', id2);

        const id3 = await client.xadd('orders', '*', 'product', 'keyboard', 'quantity', '1', 'price', '1200000');
        console.log('Added entry with ID:', id3);

        const length = await client.xlen('orders');
        console.log('Stream length:', length);

        const messages = await client.xread('COUNT', 10, 'STREAMS', 'orders', '0');
        console.log("전체 메시지 조회:")

        if (messages) {
            const streamData = messages[0][1] // [streamName, entries]
            for (const [id, fields] of streamData) {
                console.log(`ID: ${id} ${fields[1]} - ${fields[3]}개 - ${fields[5]}원`);
            }
        }

        // Consumer Group
        try {
            await client.xgroup('DESTROY', 'orders', 'order-processors');
        } catch (e) { }

        // 컨슈머 그룹을 생성
        await client.xgroup('CREATE', 'orders', 'order-processors', '0'); // $
        console.log('Consumer group "order-processors" created.');

        // XREADGROUP : Consumer Group으로 메시지를 읽는
        type StreamEntry = [string, string[]];
        type StreamReadResult = [string, StreamEntry[]][] | null;

        const conumser1Messages = await client.xreadgroup(
            'GROUP', 'order-processors', 'consumer-1',
            'COUNT', 2,
            'STREAMS', 'orders', '>'
        ) as StreamReadResult;// > : 아직 전달받지 않은 새 메시지만 읽는


        console.log("Consumer-1이 읽은 메시지:")
        if (conumser1Messages) {
            const streamData = conumser1Messages[0][1] // [streamName, entries]
            for (const [id, fields] of streamData) {
                console.log(`ID: ${id} ${fields[1]}`);

                await client.xack('orders', 'order-processors', id);
            }
        }

        const consumer2Messages = await client.xreadgroup(
            'GROUP', 'order-processors', 'consumer-2',
            'COUNT', 2,
            'STREAMS', 'orders', '>'
        ) as StreamReadResult;

        console.log('\nConsumer-2가 읽은 메시지:');
        if (consumer2Messages) {
            const entries = consumer2Messages[0][1];
            for (const [id, fields] of entries) {
                console.log(`  [${id}] ${fields[1]}`);
                await client.xack('orders', 'order-processors', id);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();