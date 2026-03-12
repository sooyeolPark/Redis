import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();

    try {
        await client.zadd('leaderboard', 100, 'Alice')
        await client.zadd('leaderboard', 95, 'Bob', 150, 'Charlie', 85, 'Dave')

        // 전체 조회 -> 낮은 점수부터 조회
        const all = await client.zrange('leaderboard', 0, -1, 'WITHSCORES');
        console.log('ZRANGE:', all);

        // ZADD의 다양한 옵션 
        // NX : 존재하지 않을 떄만 추가
        const nxResult = await client.zadd('leaderboard', 'NX', 200, 'Eve');
        const nxResult2 = await client.zadd('leaderboard', 'NX', 999, 'Alice'); // 이미 존재
        console.log('ZADD NX Results:', nxResult, nxResult2); // 1 0

        // XX : 존재할 떄만 업데이트
        const xxResult = await client.zadd('leaderboard', 'XX', 150, 'Alice');
        const xxResult2 = await client.zadd('leaderboard', 'XX', 300, 'Frank'); // 존재하지 않음
        console.log('ZADD XX Results:', xxResult, xxResult2); // 0 0
        // 새로운 멤버가 추가 -> 1
        // 기존 멤버 점수가 변경, 아무 변화가 없다 -> 0

        // GT : 새 점수가 더 클 떄만 업데이트
        const aliceScore1 = await client.zscore('leaderboard', 'Alice');
        await client.zadd('leaderboard', 'GT', 180, 'Alice'); // 업데이트 진행
        const aliceScore2 = await client.zscore('leaderboard', 'Alice');
        console.log('Alice Scores (GT):', aliceScore1, aliceScore2); // 150 180


        // ZRANGE : 범위 조회
        const bottom3 = await client.zrange('leaderboard', 0, 2, 'WITHSCORES'); // 낮은 점수부터 조회
        console.log('Bottom 3 ZRANGE:', bottom3);

        const top3 = await client.zrevrange('leaderboard', 0, 2, 'WITHSCORES'); // 높은 점수부터 조회
        console.log('Top 3 ZREVRANGE:', top3);

        // 6.2+ ZRANGE로 REV 적용
        const top3_v62 = await client.zrange('leaderboard', 0, 2, 'REV', 'WITHSCORES');
        console.log('Top 3 ZRANGE v6.2+:', top3_v62);


        // 순위 조회 : ZRANK, ZREVRANK

        // ZRANK : 낮은 점수 기준 순위 (0부터 시작)
        const rankAsc = await client.zrank('leaderboard', 'Alice');
        console.log('Alice Rank (Asc):', rankAsc);

        // ZREVRANK : 높은 점수 기준 순위 (0부터 시작)
        const rankDesc = await client.zrevrank('leaderboard', 'Alice');
        console.log('Alice Rank (Desc):', rankDesc);

        // ZINCBY : 점수 증가
        const newScore = await client.zincrby('leaderboard', 30, 'Bob');
        console.log('Bob New Score after ZINCRBY 30:', newScore);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();