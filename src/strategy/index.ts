// 1. Cache Aside


async function getUser(userId: number): Promise<User> {
    // 1. 캐시를 확인
    const cachedUser = cache.get(userId);
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }

    // 2. 캐시에 없으면 DB에서 조회
    const user = await db.findUserById(userId);

    // 3. DB에서 조회한 데이터를 캐시에 저장
    cache.set(userId, JSON.stringify(user));

    return user;
}

async function updateUser(user: User): Promise<void> {
    // 1. DB 업데이트
    await db.updateUser(user);

    // 2. 캐시 무효화
    cache.delete(user.id);
}


// 2. Write Through

async function updateUser(userId: number, data: User): Promise<void> {
    // 1. 캐시 업데이트
    await redis.set(`user:${userId}`, JSON.stringify(data));

    // 2. 데이터베이스 업데이트
    await db.execute("UPDATE users SET ... WHERE id = ?", userId);

    // 둘 다 성공해야 완료
}

async function getUser(userId: number): Promise<User> {
    const cached = await redis.get(`user:${userId}`);
    if (cached) {
        return JSON.parse(cached);
    }

    const user = await db.query("SELECT * FROM users WHERE id = ?", userId);
    await redis.set(`user:${userId}`, JSON.stringify(user));

    return user;
}


// 3. Write Behind

async function updateUser(userId: number, data: User): Promise<boolean> {
    // 1. 캐시 업데이트 (즉시 완료)
    await redis.set(`user:${userId}`, JSON.stringify(data));

    // 2. 큐에 추가
    await redis.rpush("write_queue", JSON.stringify({
        type: "update_user",
        userId: userId,
        data: data
    }));

    // 즉시 반환
    return true;
}


async function worker(): Promise<void> {
    while (true) {
        // 큐에서 꺼내기
        const item = await redis.blpop("write_queue", 1);
        if (!item) {
            continue;
        }

        const task = JSON.parse(item[1]);

        // 데이터베이스 쓰기
        if (task.type === "update_user") {
            await db.execute("UPDATE users SET ... WHERE id = ?",
                task.userId);
        }
    }
}

// Read Through

function readThroughCache<T>(
    keyFunc: (...args: any[]) => string,
    fetchFunc: (...args: any[]) => Promise<T>,
    ttl: number = 3600
) {
    return async (...args: any[]): Promise<T> => {
        // 캐시 키 생성
        const key = keyFunc(...args);

        // 캐시 확인
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        // 함수 실행 (데이터베이스 조회)
        const result = await fetchFunc(...args);

        // 캐시 저장
        await redis.setex(key, ttl, JSON.stringify(result));

        return result;
    };
}

// 사용법: 원본 함수를 래핑
async function fetchUserFromDB(userId: number): Promise<User> {
    return db.query("SELECT * FROM users WHERE id = ?", userId);
}

const getUser = readThroughCache<User>(
    (userId: number) => `user:${userId}`,
    fetchUserFromDB
);


// PER


async function getUserWithEarlyRecompute(userId: number): Promise<User> {
    const cacheKey = `user:${userId}`;

    // 캐시 가져오기 (TTL 포함)
    const cached = await redis.get(cacheKey);
    const ttl = await redis.ttl(cacheKey);

    if (cached) {
        // 만료 시간이 가까우면 재계산 확률 증가
        // delta = 현재 나이 / 원래 TTL
        // beta = 1~10 (튜닝 가능)
        const beta = 1;
        const delta = (3600 - ttl) / 3600;

        if (Math.random() < delta * beta) {
            // 재계산
            const user = await db.query("SELECT * FROM users WHERE id = ?", userId);
            await redis.setex(cacheKey, 3600, JSON.stringify(user));
            return user;
        }

        return JSON.parse(cached);
    }

    // 캐시 미스
    const user = await db.query("SELECT * FROM users WHERE id = ?", userId);
    await redis.setex(cacheKey, 3600, JSON.stringify(user));
    return user;
}



async function getUserWithLock(userId: number): Promise<User> {
    const cacheKey = `user:${userId}`;
    const lockKey = `lock:${cacheKey}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 락 획득 시도 (10초 만료)
    const acquired = await redis.set(lockKey, "1", "NX", "EX", 10);

    if (acquired) {
        try {
            // 락을 획득한 요청만 DB 조회
            const user = await db.query("SELECT * FROM users WHERE id = ?", userId);
            await redis.setex(cacheKey, 3600, JSON.stringify(user));
            return user;
        } finally {
            // 락 해제
            await redis.del(lockKey);
        }
    } else {
        // 락 획득 실패, 잠깐 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 100));
        return getUserWithLock(userId);
    }
}

async function backgroundRefresh(): Promise<void> {
    while (true) {
        // 인기 있는 아이템 목록
        const popularUsers = await getPopularUserIds();

        for (const userId of popularUsers) {
            const user = await db.query("SELECT * FROM users WHERE id = ?", userId);
            await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
        }

        // 30분마다 갱신
        await new Promise(resolve => setTimeout(resolve, 1800000));
    }
}
