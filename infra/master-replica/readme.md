# Master-Replica (주-복제) 구조

**Master** 한 대가 쓰기를 담당하고, 그 데이터를 **Replica**들이 비동기로 복제하는 구조이다. 읽기는 Master와 Replica 모두에서 할 수 있어 읽기 부하를 나눌 수 있다.

---

## 아키텍처

- **쓰기**  
  모든 쓰기(SET, INCR, LPUSH 등)는 **반드시 Master**로만 보낸다. Replica는 쓰기를 받지 않는다.

- **읽기**  
  읽기(GET, LRANGE 등)는 **Master**에서 할 수도 있고 **Replica**에서 할 수도 있다. 여러 Replica에 읽기 요청을 나누면 Master 부하를 줄이고 처리량을 늘릴 수 있다.

- **복제**  
  Master에 쓰인 데이터는 내부적으로 Replica들에게 **비동기 복제**된다. Replica는 Master의 데이터 사본을 유지하므로 Master와 동일한 데이터를 읽을 수 있다. (복제 지연이 있을 수 있다.)

- **특징**  
  Master 장애 시 **자동 전환은 없다**. 수동으로 Replica를 Master로 승격하거나, Sentinel/Cluster처럼 자동 페일오버를 쓰려면 별도 구성이 필요하다.

---

## Docker Compose로 실행하기

이 폴더의 `docker-compose.yml`은 Master 1대와 Replica 2대를 구성한다.

| 서비스 | 역할 | 호스트 포트 | 컨테이너 |
|--------|------|-------------|----------|
| **redis-master** | 쓰기·읽기 | `6379` | `redis-master` |
| **redis-replica-1** | 읽기 전용 (Master 복제) | `6380` | `redis-replica-1` |
| **redis-replica-2** | 읽기 전용 (Master 복제) | `6381` | `redis-replica-2` |

Replica는 `redis-server --replicaof redis-master 6379`로 Master를 바라보도록 설정된다.