# Redis Sorted Set 타입

Redis Sorted Set은 **멤버(member)**마다 **점수(score)**가 붙고, 점수 순으로 자동 정렬되는 자료구조이다. Set처럼 멤버는 유일하며, 삽입·삭제는 O(log N)이고 범위·순위 조회가 효율적이라 **리더보드, 랭킹, 우선순위 큐** 등에 널리 쓰인다.

---

## Sorted Set의 주요 특징

### 1. 점수 기반 정렬 (Score-based Sorting)

멤버는 **score**에 따라 항상 정렬된 상태를 유지한다.

- **Score로 자동 정렬:** ZADD로 넣거나 score를 바꾸면 Redis가 내부적으로 순서를 맞춘다. 별도 정렬 명령 없이 **낮은 score부터** 또는 **높은 score부터** 조회할 수 있다.
- **동점 처리:** score가 같으면 멤버 문자열의 **사전순(lexicographical order)**으로 순서가 정해진다.

### 2. 중복 없는 요소 (Unique Members)

Set과 마찬가지로 **멤버는 한 Sorted Set 안에서 유일**하다.

- **Set의 유일성:** 같은 멤버를 여러 번 ZADD해도 하나만 존재하며, 나중 ZADD는 그 멤버의 **score만 갱신**한다. 멤버가 키이고 score가 값에 해당하는 구조이다.
- **활용:** 한 사용자 ID, 한 상품 ID당 하나의 점수만 두는 리더보드·랭킹에 적합하다.

### 3. O(log N) 삽입/삭제

삽입·삭제·score 변경이 **O(log N)**으로 동작한다.

- **Skip List + Hash Table:** Redis Sorted Set은 내부적으로 **Skip List**와 **Hash Table**을 함께 쓴다. Skip List로 score 순서와 범위 조회를 빠르게 하고, Hash Table로 멤버→score 조회를 O(1)에 한다.
- **효율성:** 원소가 많아져도 로그 시간으로 동작하여, 대규모 랭킹·타임라인에도 사용 가능하다.

### 4. 범위 조회 지원 (Range Queries)

**구간별 조회**와 **순위(rank) 조회**가 잘 지원된다.

- **순위·랭킹 시스템:** “상위 N명”, “이 점수 구간의 멤버”, “이 멤버의 순위” 등을 한두 번의 명령으로 구할 수 있다.
- **활용:** 게임 리더보드, 실시간 랭킹, 점수 구간별 통계, 지연 시간별 정렬 등에 적합하다.

---

## ZADD (요소 추가·업데이트)

- **문법:** `ZADD key score member [score member ...]` 또는 옵션과 함께 `ZADD key [NX|XX] [GT|LT] [CH] score member ...`.
- **동작:** 지정한 **멤버**를 해당 **score**로 Sorted Set에 넣거나, 이미 있으면 **score만 변경**한다.

### 새 요소 삽입 / 기존 요소 score 변경

- **새 요소 삽입:** 멤버가 아직 없으면 **새로 추가**된다.
- **기존 요소 score 변경:** 멤버가 이미 있으면 **해당 멤버의 score**가 새 값으로 바뀌고, 정렬 순서가 다시 잡힌다.

### 자동 정렬 위치 조정

- score를 바꾸거나 새 멤버를 넣으면 Redis가 **정렬 순서를 유지**하도록 위치를 조정한다. 별도 SORT 명령 없이 ZRANGE/ZREVRANGE로 항상 정렬된 결과를 얻을 수 있다.

### ZADD 옵션 (Redis 3.0.2, 6.2+)

| 옵션 | 설명 |
|------|------|
| **NX** | **멤버가 없을 때만** 추가한다. 이미 있으면 score를 바꾸지 않는다. |
| **XX** | **멤버가 있을 때만** score를 갱신한다. 없으면 아무 동작도 하지 않는다. |
| **GT** | 새 score가 **기존보다 클 때만** 갱신한다. (Greater Than) 점수는 올라가기만 할 때 유용하다. |
| **LT** | 새 score가 **기존보다 작을 때만** 갱신한다. (Less Than) |
| **CH** | 반환값을 “새로 추가된 수”가 아니라 “변경된 멤버 수”(추가+score 변경)로 한다. |

### 시간 복잡도

- 멤버 하나 추가/갱신당 **O(log N)**. N은 Sorted Set의 현재 크기이다.

---

## 범위 조회 (ZRANGE, ZREVRANGE)

**인덱스(rank) 구간**으로 멤버를 가져온다. 0이 “첫 번째”, -1이 “마지막”이다.

### ZRANGE (오름차순)

- **동작:** `ZRANGE key start stop [WITHSCORES]`는 **score가 낮은 순**으로 정렬했을 때, start~stop 인덱스 구간의 멤버를 반환한다.
- **낮은 score부터 높은 score로:** rank 0이 가장 낮은 score, rank -1이 가장 높은 score에 해당한다.
- **WITHSCORES:** 옵션을 주면 `member1, score1, member2, score2, ...` 형태로 반환된다.
- **예:** `ZRANGE leaderboard 0 2 WITHSCORES` → 하위 3명.

### ZREVRANGE (내림차순)

- **동작:** `ZREVRANGE key start stop [WITHSCORES]`는 **score가 높은 순**으로 정렬했을 때, start~stop 구간의 멤버를 반환한다.
- **높은 score부터 낮은 score로:** rank 0이 1등(가장 높은 score), rank -1이 꼴찌에 해당한다.
- **예:** `ZREVRANGE leaderboard 0 2 WITHSCORES` → 상위 3명(리더보드 탑 3).

### Redis 6.2+ ZRANGE with REV

- `ZRANGE key start stop REV WITHSCORES`처럼 **REV**를 주면 ZREVRANGE와 같이 **내림차순**으로 같은 구간을 반환한다. ZRANGE 하나로 방향만 바꿔 쓸 수 있다.

### 시간 복잡도

- **O(log N + M).** N은 Sorted Set 크기, M은 반환하는 멤버 수이다. start 위치를 찾는 데 log N, 그 다음 M개를 순서대로 읽는다.

---

## 순위 조회 (ZRANK, ZREVRANK)

**특정 멤버가 몇 위인지**를 0부터 시작하는 **순위(rank)**로 반환한다.

### ZRANK (오름차순 순위)

- **동작:** `ZRANK key member`는 해당 멤버를 **score 오름차순**(낮은 것 먼저)으로 볼 때의 **순위**를 반환한다.
- **낮은 score가 0:** 가장 낮은 score를 가진 멤버가 rank 0, 그다음이 1, … 이다.
- **멤버가 없으면:** nil을 반환한다.

### ZREVRANK (내림차순 순위)

- **동작:** `ZREVRANK key member`는 해당 멤버를 **score 내림차순**(높은 것 먼저)으로 볼 때의 **순위**를 반환한다.
- **높은 score가 0:** 가장 높은 score를 가진 멤버가 1등(rank 0), 그다음이 2등(rank 1), … 이다. 리더보드 “몇 위?”에 맞는 순위이다.
- **멤버가 없으면:** nil을 반환한다.

### 시간 복잡도

- **O(log N).** Skip List에서 해당 멤버의 위치를 찾는 비용이다.

---

## ZREM (요소 삭제)

- **동작:** `ZREM key member [member ...]`는 지정한 **멤버들**을 해당 Sorted Set에서 **삭제**한다.
- **여러 요소 동시 삭제 가능:** 한 번에 여러 멤버를 인자로 줄 수 있다.
- **존재하는 요소만 삭제:** Set에 없던 멤버는 무시되고, **실제로 삭제된 멤버 개수**만 반환한다.
- **반환값:** 삭제된 멤버의 개수(정수)를 반환한다. “존재하는 요소만 카운트”된다.
- **시간 복잡도:** **O(M × log N).** M은 삭제 대상 멤버 수, N은 Sorted Set 크기이다. 멤버마다 찾고 제거하는 비용이 든다.

---

## ZINCRBY (score 증감)

- **동작:** `ZINCRBY key increment member`는 해당 **멤버의 score**에 **increment**를 **더한다**. 멤버가 없으면 score를 0으로 보고 그 위에 increment를 더한 값으로 **새로 추가**한다.
- **양수/음수 모두 가능:** increment가 양수면 **증가**, 음수면 **감소**이다. 한 명령으로 “점수 올리기”와 “점수 깎기”를 모두 처리할 수 있다.
- **원자적 연산:** ZINCRBY는 **원자적**으로 실행된다. 여러 클라이언트가 동시에 같은 멤버의 score를 바꿔도 연산이 쪼개지지 않아 **레이스 컨디션**이 발생하지 않는다.
- **Race Condition 방지:** 리더보드에서 “점수 +10”을 수천 명이 동시에 해도 값이 정확히 누적된다. 락 없이 안전하게 사용할 수 있다.
- **반환값:** 갱신된 **score 값**을 반환한다.
- **시간 복잡도:** **O(log N).**

---

## ZSCORE, ZCARD, ZCOUNT

### ZSCORE (멤버의 score 조회)

- **동작:** `ZSCORE key member`는 해당 멤버의 **score**를 반환한다. 멤버가 없으면 nil을 반환한다.
- **시간 복잡도:** **O(1).** 내부 Hash Table로 바로 조회한다.

### ZCARD (멤버 개수)

- **동작:** `ZCARD key`는 Sorted Set에 들어 있는 **멤버 개수**를 반환한다.
- **시간 복잡도:** **O(1).**

### ZCOUNT (score 구간 내 멤버 수)

- **동작:** `ZCOUNT key min max`는 score가 **min 이상 max 이하**인 멤버의 **개수**를 반환한다. min, max에 `-inf`, `+inf`를 쓸 수 있다.
- **활용:** “이 점수대에 몇 명 있는지” 같은 통계에 쓸 수 있다.
- **시간 복잡도:** **O(log N).**

---

## ZRANGEBYSCORE / ZREVRANGEBYSCORE (score 구간 조회)

- **ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]:** score가 min~max **구간**에 있는 멤버를 **score 오름차순**으로 반환한다. 인덱스가 아니라 **score 범위**로 조회할 때 사용한다.
- **ZREVRANGEBYSCORE:** 같은 구간을 **score 내림차순**으로 반환한다.
- **LIMIT:** 결과 개수를 제한할 때 사용한다. 예: 상위 10명만 필요할 때 ZREVRANGE 0 9로 충분하고, “80점~90점 구간에서 5명만” 같은 요구에 ZRANGEBYSCORE + LIMIT이 유용하다.
- **시간 복잡도:** O(log N + M). M은 반환되는 멤버 수이다.

---

## 활용 요약

| 용도 | 사용 명령 예 |
|------|----------------|
| **리더보드(상위 N명)** | ZREVRANGE key 0 N-1 WITHSCORES |
| **내 순위** | ZREVRANK key member |
| **점수 갱신(추가)** | ZINCRBY key delta member 또는 ZADD key GT score member |
| **최근/우선순위 큐** | score를 타임스탬프나 우선순위 값으로 두고 ZRANGE/ZREVRANGE |
| **구간 통계** | ZCOUNT key min max, ZRANGEBYSCORE key min max |

Sorted Set은 **점수 기반 정렬**, **유일 멤버**, **O(log N) 연산**, **범위·순위 조회**가 모두 필요할 때 Set이나 List보다 적합하다.
