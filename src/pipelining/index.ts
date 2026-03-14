import { createRedisClient, disconnectRedisClient } from '../connection';

async function main() {
  const client = createRedisClient();

  try {
    // --- 1. 일반 실행 (요청-응답 반복) ---
    console.log('=== 일반 실행 (각 명령마다 RTT 1번) ===');
    await client.del('pipeline:demo');

    await client.set('pipeline:demo:a', '1');
    await client.set('pipeline:demo:b', '2');
    await client.set('pipeline:demo:c', '3');

    const a1 = await client.get('pipeline:demo:a');
    const b1 = await client.get('pipeline:demo:b');
    const c1 = await client.get('pipeline:demo:c');
    console.log('일반 실행 결과:', { a: a1, b: b1, c: c1 });

    // --- 2. 파이프라이닝 (명령 일괄 전송 → 응답 일괄 수신) ---
    console.log('\n=== 파이프라이닝 (한 번의 RTT로 여러 명령) ===');
    await client.del('pipeline:demo');

    const pipeline = client.pipeline();
    pipeline.set('pipeline:demo:a', '10');
    pipeline.set('pipeline:demo:b', '20');
    pipeline.set('pipeline:demo:c', '30');
    pipeline.get('pipeline:demo:a');
    pipeline.get('pipeline:demo:b');
    pipeline.get('pipeline:demo:c');
    pipeline.incr('pipeline:demo:counter');
    pipeline.incr('pipeline:demo:counter');

    const results = await pipeline.exec();
    if (!results) {
      console.log('Pipeline exec failed');
      return;
    }

    console.log('Pipeline 결과 (각 명령의 [err, result]):');
    results.forEach(([err, result], i) => {
      console.log(`  [${i}] err=${err ?? 'null'}, result=${JSON.stringify(result)}`);
    });

    // 결과만 추출 (에러 없을 때)
    const values = results.slice(3, 6).map(([err, res]) => (err ? null : res));
    console.log('GET 결과만:', { a: values[0], b: values[1], c: values[2] });
    console.log('INCR 결과 (counter):', results[6]?.[1], results[7]?.[1]);

    // --- 3. 여러 키 한꺼번에 조회 (실용 예시) ---
    console.log('\n=== 실용 예: 여러 사용자 정보 일괄 조회 ===');
    const pipeline2 = client.pipeline();
    pipeline2.hset('user:1', { name: 'Alice', score: '100' });
    pipeline2.hset('user:2', { name: 'Bob', score: '200' });
    pipeline2.hset('user:3', { name: 'Charlie', score: '150' });
    pipeline2.hgetall('user:1');
    pipeline2.hgetall('user:2');
    pipeline2.hgetall('user:3');

    const results2 = await pipeline2.exec();
    if (results2) {
      const users = results2.slice(3, 6).map(([err, res]) => (err ? null : res));
      console.log('일괄 HGETALL 결과:', users);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await disconnectRedisClient(client);
  }
}

main();
