# Redis Study

Redis(Remote Dictionary Server) 학습 및 실습 프로젝트

---

## Redis란?

**Redis**는 **Remote Dictionary Server**의 약자로, 원격에서 키-값 형태로 데이터를 저장·조회할 수 있는 인메모리 데이터 저장소이다.

### Redis의 세 가지 핵심 특성

| 특성 | 설명 |
|------|------|
| **In-Memory 데이터 저장소** | RAM에 데이터를 저장하여 **밀리초 단위**의 빠른 응답을 제공한다. |
| **Key-Value NoSQL DB** | **키로 값 조회**가 가능한 단순한 구조의 NoSQL 데이터베이스이다. |
| **다양한 자료구조 지원** | String, List, Set, Hash, Sorted Set 등 여러 데이터 타입을 지원한다. |

---

## In-Memory DB의 장단점

### 장점

- **극도로 빠른 속도 (0.1~1ms)**  
  디스크 I/O 없이 메모리에서 처리하여 응답 시간이 매우 짧다.
- **낮은 지연시간 (Low Latency)**  
  데이터 접근 시 발생하는 지연이 적다.
- **높은 처리량**  
  초당 수십만 건 이상의 요청을 처리할 수 있다.

### 단점

- **휘발성 (재시작 시 손실)**  
  메모리에만 데이터가 있으면 서버 재시작 시 데이터가 사라질 수 있다. (Redis는 RDB/AOF로 영속성 옵션을 제공한다.)
- **메모리 용량 제한 / 비용**  
  물리적 메모리 크기에 제한이 있고, 대용량 메모리는 비용이 높다.
- **Hot Data 위주 저장**  
  모든 데이터를 올리기보다는 자주 접근하는 데이터(Hot Data)를 저장하는 데 적합하다.

---

## 데이터베이스 비교

### Redis vs 관계형 DB (RDBMS)

| 구분 | Redis | 관계형 DB |
|------|--------|-----------|
| 저장 방식 | In-Memory | 디스크 기반 |
| 데이터 모델 | Key-Value | 관계형 (테이블, 스키마) |
| 강점 | 속도, 단순 조회 | 복잡한 쿼리, 트랜잭션, 정규화 |

### Redis vs MongoDB

| 구분 | Redis | MongoDB |
|------|--------|---------|
| 저장 방식 | 메모리 | 디스크 + 캐시 |
| 쿼리 | 제한적 (키 기반) | 풍부한 쿼리 (문서 검색) |
| 용도 | 실시간 처리, Pub/Sub, 캐시 | 문서 저장, 복잡한 조회 |

### Redis vs Memcached

| 구분 | Redis | Memcached |
|------|--------|-----------|
| 자료구조 | String, List, Set, Hash, Sorted Set 등 | 주로 String |
| 영속성 | 옵션으로 디스크 저장 가능 | 없음 (순수 캐시) |
| 스레드 모델 | 단일 스레드 | 멀티 스레드 |

---

## 아키텍처 구조

Redis는 구성에 따라 **단일 인스턴스**, **Master-Replica**, **Sentinel**, **Cluster** 네 가지 형태로 운용할 수 있다. 각 구성별 상세 설명과 **Docker Compose** 실행 방법은 아래 폴더의 `readme.md`에 정리되어 있다.

| 구성 | 설명 | 실습 경로 |
|------|------|-----------|
| **1. 기본 구조 (단일 인스턴스)** | 클라이언트가 Redis 서버 한 대에 직접 연결. 구성이 단순하고 개발·테스트에 적합하다. | [infra/single/](infra/single/readme.md) |
| **2. Master-Replica** | Master가 쓰기, Replica가 비동기 복제. 읽기는 Master/Replica 모두 가능해 읽기 부하 분산이 가능하다. 자동 페일오버는 없다. | [infra/master-replica/](infra/master-replica/readme.md) |
| **3. Redis Sentinel** | Master-Replica 위에 Sentinel을 두어 Master 장애 시 **자동 페일오버**. 고가용성에 초점을 둔 구성이다. | [infra/sentinel/](infra/sentinel/readme.md) |
| **4. Redis Cluster** | 16384 슬롯으로 데이터를 여러 Master에 샤딩하고, 각 Master에 Replica를 두어 **수평 확장 + 고가용성**을 제공한다. | [infra/cluster/](infra/cluster/readme.md) |

각 폴더의 `docker-compose.yml`로 해당 구성을 바로 띄워 실습할 수 있다.

---
