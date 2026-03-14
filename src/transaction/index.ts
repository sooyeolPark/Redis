import { createRedisClient, disconnectRedisClient } from '../connection';

async function main() {
  const client = createRedisClient();

  try {
    // --- 1. MULTI / EXEC 기본 ---
    console.log('=== MULTI / EXEC: 명령 일괄 실행 (격리) ===');
    await client.del('tx:balance:user1', 'tx:balance:user2');

    const multi = client.multi();
    multi.set('tx:balance:user1', '1000');
    multi.set('tx:balance:user2', '500');
    multi.get('tx:balance:user1');
    multi.get('tx:balance:user2');

    const results = await multi.exec();
    if (!results) {
      console.log('Transaction exec failed');
      return;
    }

    console.log('MULTI/EXEC 결과:', results.map(([err, res]) => (err ? err.message : res)));
    console.log('user1 balance:', results[2]?.[1]);
    console.log('user2 balance:', results[3]?.[1]);

    // --- 2. 트랜잭션으로 "이체" 시뮬레이션 ---
    console.log('\n=== 트랜잭션: user1 → user2 로 100 이체 ===');
    const multi2 = client.multi();
    multi2.decrby('tx:balance:user1', 100);
    multi2.incrby('tx:balance:user2', 100);
    
    multi2.get('tx:balance:user1');
    multi2.get('tx:balance:user2');

    const results2 = await multi2.exec();
    if (results2) {
      console.log('이체 후 user1:', results2[2]?.[1], ', user2:', results2[3]?.[1]);
    }

    // --- 3. WATCH + 낙관적 잠금 (조건부 실행) ---
    // WATCH는 "다른 클라이언트"가 키를 수정했을 때만 EXEC를 거부한다.
    // 같은 클라이언트가 같은 트랜잭션 안에서 수정하는 건 "내가 실행한 결과"이므로 EXEC 성공.
    console.log('\n=== WATCH: 같은 클라이언트 → EXEC 성공 (키는 트랜잭션 안에서만 변경) ===');
    await client.set('tx:config:version', '1');

    await client.watch('tx:config:version');
    const multi3 = client.multi();
    multi3.incr('tx:config:version');
    multi3.get('tx:config:version');

    const results3 = await multi3.exec();
    if (results3) {
      console.log('WATCH 후 EXEC 성공. version:', results3[1]?.[1]);
    } else {
      console.log('WATCH된 키가 변경되어 EXEC가 거부됨 (nil 반환)');
    }

    // --- 3b. 다른 클라이언트가 중간에 수정 → EXEC 실패 시연 ---
    console.log('\n=== WATCH: 다른 클라이언트가 수정 → EXEC 실패 ===');
    await client.set('tx:config:version', '1');

    const otherClient = createRedisClient();
    await client.watch('tx:config:version');
    const multi3b = client.multi();
    multi3b.incr('tx:config:version');
    multi3b.get('tx:config:version');

    // 다른 연결에서 WATCH된 키를 수정 → EXEC 시 거부됨
    await otherClient.set('tx:config:version', '999');
    await disconnectRedisClient(otherClient);

    const results3b = await multi3b.exec();
    if (results3b) {
      console.log('EXEC 성공 (예상 아님):', results3b[1]?.[1]);
    } else {
      console.log('EXEC 거부됨 (null) — 다른 클라이언트가 tx:config:version을 수정했기 때문');
    }

    // --- 4. DISCARD: 큐 버리기 ---
    console.log('\n=== DISCARD: 트랜잭션 큐 취소 ===');
    const multi4 = client.multi();
    multi4.set('tx:discard:test', 'will not run');
    await multi4.discard();
    const discarded = await client.get('tx:discard:test');
    console.log('DISCARD 후 키 값 (없어야 함):', discarded);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await disconnectRedisClient(client);
  }
}

main();
