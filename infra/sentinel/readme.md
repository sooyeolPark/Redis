# Redis Sentinel

Master-Replica 구성 위에 **Sentinel**을 두어, Master와 Replica를 모니터링하고 Master 장애 시 **자동 페일오버**를 수행하는 고가용성 구성이다.

---

## 아키텍처

- **클라이언트 연결**  
  클라이언트는 Redis Master/Replica에 직접 주소를 넣지 않고, **Sentinel**에 먼저 연결하여 "현재 Master가 누구인지"를 묻는다. Sentinel이 알려준 Master 주소로 쓰기 요청을 보내고, 필요하면 Replica 주소로 읽기 요청을 분산한다. Master가 바뀌어도 Sentinel이 새 Master를 알려주므로 클라이언트는 계속 올바른 노드에 연결할 수 있다.

- **Sentinel의 역할**  
  Sentinel 인스턴스(보통 3개 이상, 홀수)가 Master와 모든 Replica를 **지속적으로 모니터링**한다. Master에 장애(다운, 네트워크 단절 등)가 감지되면 Sentinel들끼리 합의(quorum)를 통해 "Master가 죽었다"고 판단하고, Replica 중 하나를 **새 Master**로 선출한다. 나머지 Replica와 이전 Master(복구 시)는 새 Master의 Replica로 재설정된다.

- **모니터링**  
  각 Sentinel은 Master·Replica에 주기적으로 헬스 체크를 보내 상태를 확인한다. 이 정보를 다른 Sentinel과 공유하여 장애 감지와 페일오버 결정을 함께 한다.

- **정리**  
  단일 Master-Replica만 쓰면 Master 장애 시 수동 개입이 필요하지만, Sentinel을 쓰면 **자동 페일오버**로 서비스 연속성을 높일 수 있다. 데이터를 여러 노드에 나누어 저장하는(샤딩) 기능은 없고, 고가용성에 초점을 둔 구성이다.

---

## Docker Compose로 실행하기

이 폴더의 `docker-compose.yml`은 Master 1대, Replica 2대, Sentinel 3대를 구성한다.

| 서비스 | 역할 | 호스트 포트 | 컨테이너 |
|--------|------|-------------|----------|
| **redis-master** | 초기 Master | `6379` | `redis-sentinel-master` |
| **redis-replica-1** | Replica | `6380` | `redis-sentinel-replica-1` |
| **redis-replica-2** | Replica | `6381` | `redis-sentinel-replica-2` |
| **sentinel-1** | Sentinel (모니터링·페일오버) | `26379` | `redis-sentinel-1` |
| **sentinel-2** | Sentinel | `26380` | `redis-sentinel-2` |
| **sentinel-3** | Sentinel | `26381` | `redis-sentinel-3` |

Sentinel 설정 요약: `mymaster`를 `redis-master:6379`로 모니터링, quorum 2, `down-after-milliseconds` 5000, `failover-timeout` 10000.