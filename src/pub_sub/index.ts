import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    // -- subcriber : 구독 모드로 전화되면, 다른 명령어 사용 불가
    // -- publisher: 메시지 발행

    const subcriber = createRedisClient();
    const publisher = createRedisClient();

    const patternSubscriber = createRedisClient();

    try {
        const channel = 'test:notification'

        subcriber.on('message', (channel, message) => {
            console.log(`Message received from channel ${channel}: ${message}`);
        });

        await subcriber.subscribe(channel);
        console.log(`채널 구독 시작: ${channel}`);

        const message1 = "Hello, Redis Pub/Sub!";
        const receivers1 = await publisher.publish(channel, message1);
        console.log(`메시지 발행: "${message1}", 수신자 수: ${receivers1}`);

        const message2 = "Another message for subscribers.";
        const receivers2 = await publisher.publish(channel, message2);
        console.log(`메시지 발행: "${message2}", 수신자 수: ${receivers2}`);

        // 메시지가 수신될 시간을 잠시 기다림
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 패턴 구독

        patternSubscriber.on('pmessage', (pattern, channel, message) => {
            console.log(`Pattern message received from pattern ${pattern}, channel ${channel}: ${message}`);
        })

        await patternSubscriber.psubscribe('news:*'); // new:* -> new:로 시작하는 모든 채널
        console.log('패턴 구독 시작: news:*');

        await publisher.publish('news:weather', '오늘의 날씨는 맑음입니다.');
        await publisher.publish('news:sports', '오늘의 경기 결과입니다.');
        await publisher.publish('updates:general', '일반 업데이트 메시지입니다.'); // 구독되지 않음

        // 메시지가 수신될 시간을 잠시 기다림
        await new Promise(resolve => setTimeout(resolve, 1000));

        await patternSubscriber.punsubscribe('news:*');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(subcriber);
        await disconnectRedisClient(publisher);
    }
}

main();