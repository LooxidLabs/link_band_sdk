# DataCenter 세션 삭제 기능 개발 기획서

## 📋 개요

### 목적
- DataCenter의 SessionList에 누적된 세션 데이터를 효율적으로 관리
- 사용자가 불필요한 세션을 선택적으로 또는 일괄 삭제할 수 있는 기능 제공
- 로컬 파일 시스템과 데이터베이스의 일관성 유지

### 범위
- **프론트엔드**: DataCenter UI에 삭제 기능 추가
- **백엔드**: 세션 삭제 API 및 파일 시스템 관리
- **데이터베이스**: 세션 레코드 삭제 및 참조 무결성 관리

---

## 🎯 요구사항 분석

### 기능적 요구사항

#### 1. 선택적 삭제
- [ ] 개별 세션 선택 및 삭제
- [ ] 다중 세션 선택 및 일괄 삭제
- [ ] 체크박스 기반 선택 UI

#### 2. 전체 삭제
- [ ] 모든 세션 일괄 삭제 기능
- [ ] 안전장치: 확인 대화상자

#### 3. 데이터 완전 삭제
- [ ] 로컬 파일 시스템에서 원본 파일 삭제
- [ ] 데이터베이스에서 세션 레코드 삭제
- [ ] 관련 메타데이터 및 인덱스 정리

#### 4. 사용자 경험
- [ ] 삭제 전 확인 대화상자
- [ ] 삭제 진행 상황 표시
- [ ] 삭제 완료 후 목록 자동 새로고침
- [ ] 실행 취소 불가 경고

### 비기능적 요구사항

#### 1. 안전성
- [ ] 삭제 작업의 원자성 보장
- [ ] 파일 삭제 실패 시 롤백 메커니즘
- [ ] 삭제 권한 검증

#### 2. 성능
- [ ] 대용량 파일 삭제 시 비동기 처리
- [ ] UI 블로킹 방지
- [ ] 진행 상황 실시간 업데이트

#### 3. 사용성
- [ ] 직관적인 UI/UX
- [ ] 명확한 에러 메시지
- [ ] 접근성 고려

---

## 🏗️ 시스템 아키텍처

### 컴포넌트 구조

```
DataCenter/
├── SessionList.tsx (기존)
├── SessionDeleteModal.tsx (신규)
├── SessionBulkActions.tsx (신규)
└── DeleteConfirmDialog.tsx (신규)
```

### API 엔드포인트

```
DELETE /data/sessions/{session_id}     # 개별 세션 삭제
DELETE /data/sessions/bulk             # 다중 세션 삭제
DELETE /data/sessions/all              # 전체 세션 삭제
GET    /data/sessions/{session_id}/files # 세션 파일 목록 조회
```

---

## 📱 UI/UX 설계

### 1. SessionList 개선

#### 기존 UI 수정
```tsx
// 각 세션 항목에 체크박스 추가
<SessionItem>
  <Checkbox 
    checked={selectedSessions.includes(session.id)}
    onChange={(checked) => handleSessionSelect(session.id, checked)}
  />
  <SessionInfo>...</SessionInfo>
  <ActionButtons>
    <DeleteButton onClick={() => handleDeleteSingle(session.id)} />
  </ActionButtons>
</SessionItem>
```

#### 상단 액션 바 추가
```tsx
<BulkActionsBar>
  <SelectAllCheckbox />
  <SelectedCount>{selectedSessions.length} selected</SelectedCount>
  <ActionButtons>
    <DeleteSelectedButton disabled={selectedSessions.length === 0} />
    <DeleteAllButton />
  </ActionButtons>
</BulkActionsBar>
```

### 2. 삭제 확인 대화상자

#### 개별 삭제 확인
```tsx
<DeleteConfirmDialog>
  <Title>Delete Session</Title>
  <Message>
    Are you sure you want to delete session "{sessionName}"?
    This action cannot be undone.
  </Message>
  <FileList>
    <FileItem>session_data.json (2.5 MB)</FileItem>
    <FileItem>eeg_raw.csv (15.3 MB)</FileItem>
    <!-- ... -->
  </FileList>
  <Actions>
    <CancelButton />
    <DeleteButton variant="destructive" />
  </Actions>
</DeleteConfirmDialog>
```

#### 다중/전체 삭제 확인
```tsx
<BulkDeleteConfirmDialog>
  <Title>Delete {count} Sessions</Title>
  <Message>
    This will permanently delete {count} sessions and all associated files.
    Total size: {totalSize}
  </Message>
  <WarningBox>
    ⚠️ This action cannot be undone!
  </WarningBox>
  <Actions>
    <CancelButton />
    <DeleteButton variant="destructive">Delete All</DeleteButton>
  </Actions>
</BulkDeleteConfirmDialog>
```

### 3. 삭제 진행 상황 표시

```tsx
<DeleteProgressDialog>
  <Title>Deleting Sessions...</Title>
  <ProgressBar value={progress} max={100} />
  <Status>
    Deleting {currentFile} ({currentIndex}/{totalFiles})
  </Status>
  <Details>
    <CompletedCount>{completedCount} completed</CompletedCount>
    <FailedCount>{failedCount} failed</FailedCount>
  </Details>
</DeleteProgressDialog>
```

---

## 🔧 백엔드 구현

### 1. API 엔드포인트 구현

#### 개별 세션 삭제
```python
@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """개별 세션 삭제"""
    try:
        # 1. 세션 정보 조회
        session = await get_session_by_id(session_id)
        if not session:
            raise HTTPException(404, "Session not found")
        
        # 2. 관련 파일 목록 조회
        files = await get_session_files(session_id)
        
        # 3. 파일 삭제
        deleted_files = []
        failed_files = []
        
        for file_path in files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files.append(file_path)
            except Exception as e:
                failed_files.append({"path": file_path, "error": str(e)})
        
        # 4. DB 레코드 삭제
        await delete_session_from_db(session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "deleted_files": deleted_files,
            "failed_files": failed_files
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to delete session: {str(e)}")
```

#### 다중 세션 삭제
```python
@router.delete("/sessions/bulk")
async def delete_sessions_bulk(session_ids: List[str]):
    """다중 세션 일괄 삭제"""
    results = []
    
    for session_id in session_ids:
        try:
            result = await delete_single_session(session_id)
            results.append(result)
        except Exception as e:
            results.append({
                "success": False,
                "session_id": session_id,
                "error": str(e)
            })
    
    return {
        "results": results,
        "total": len(session_ids),
        "successful": len([r for r in results if r["success"]]),
        "failed": len([r for r in results if not r["success"]])
    }
```

#### 전체 세션 삭제
```python
@router.delete("/sessions/all")
async def delete_all_sessions():
    """모든 세션 삭제"""
    try:
        # 1. 모든 세션 ID 조회
        all_sessions = await get_all_session_ids()
        
        # 2. 일괄 삭제 실행
        result = await delete_sessions_bulk(all_sessions)
        
        # 3. 데이터 디렉토리 정리
        await cleanup_data_directory()
        
        return result
        
    except Exception as e:
        raise HTTPException(500, f"Failed to delete all sessions: {str(e)}")
```

### 2. 파일 시스템 관리

#### 안전한 파일 삭제
```python
async def safe_delete_file(file_path: str) -> dict:
    """안전한 파일 삭제 (권한 검사 포함)"""
    try:
        # 1. 파일 존재 확인
        if not os.path.exists(file_path):
            return {"success": True, "message": "File already deleted"}
        
        # 2. 삭제 권한 확인
        if not os.access(file_path, os.W_OK):
            return {"success": False, "error": "No write permission"}
        
        # 3. 파일 크기 확인 (로깅용)
        file_size = os.path.getsize(file_path)
        
        # 4. 파일 삭제
        os.remove(file_path)
        
        return {
            "success": True,
            "file_path": file_path,
            "size_deleted": file_size
        }
        
    except Exception as e:
        return {
            "success": False,
            "file_path": file_path,
            "error": str(e)
        }
```

#### 디렉토리 정리
```python
async def cleanup_empty_directories(base_path: str):
    """빈 디렉토리 정리"""
    for root, dirs, files in os.walk(base_path, topdown=False):
        for dir_name in dirs:
            dir_path = os.path.join(root, dir_name)
            try:
                if not os.listdir(dir_path):  # 빈 디렉토리
                    os.rmdir(dir_path)
                    logger.info(f"Removed empty directory: {dir_path}")
            except Exception as e:
                logger.warning(f"Failed to remove directory {dir_path}: {e}")
```

### 3. 데이터베이스 관리

#### 세션 삭제 (관련 레코드 포함)
```python
async def delete_session_from_db(session_id: str):
    """세션과 관련된 모든 DB 레코드 삭제"""
    async with get_db_connection() as db:
        try:
            # 트랜잭션 시작
            await db.begin()
            
            # 1. 세션 파일 레코드 삭제
            await db.execute(
                "DELETE FROM session_files WHERE session_id = ?",
                (session_id,)
            )
            
            # 2. 세션 메타데이터 삭제
            await db.execute(
                "DELETE FROM session_metadata WHERE session_id = ?",
                (session_id,)
            )
            
            # 3. 메인 세션 레코드 삭제
            result = await db.execute(
                "DELETE FROM sessions WHERE id = ?",
                (session_id,)
            )
            
            if result.rowcount == 0:
                raise Exception("Session not found in database")
            
            # 트랜잭션 커밋
            await db.commit()
            
        except Exception as e:
            # 롤백
            await db.rollback()
            raise e
```

---

## 📋 구현 단계

### Phase 1: 백엔드 API 구현 (1-2일)
- [ ] 개별 세션 삭제 API
- [ ] 다중 세션 삭제 API
- [ ] 전체 세션 삭제 API
- [ ] 파일 시스템 관리 유틸리티
- [ ] 데이터베이스 삭제 로직
- [ ] API 테스트 작성

### Phase 2: 프론트엔드 UI 구현 (2-3일)
- [ ] SessionList 컴포넌트 수정 (체크박스 추가)
- [ ] BulkActionsBar 컴포넌트 개발
- [ ] DeleteConfirmDialog 컴포넌트 개발
- [ ] DeleteProgressDialog 컴포넌트 개발
- [ ] 상태 관리 로직 구현

### Phase 3: 통합 및 테스트 (1-2일)
- [ ] 프론트엔드-백엔드 통합
- [ ] 에러 처리 및 예외 상황 테스트
- [ ] 사용자 경험 개선
- [ ] 성능 최적화

### Phase 4: 문서화 및 배포 (1일)
- [ ] API 문서 업데이트
- [ ] 사용자 가이드 작성
- [ ] 코드 리뷰 및 최종 테스트

---

## 🧪 테스트 계획

### 단위 테스트
- [ ] 개별 세션 삭제 API 테스트
- [ ] 다중 세션 삭제 API 테스트
- [ ] 파일 삭제 유틸리티 테스트
- [ ] 데이터베이스 삭제 로직 테스트

### 통합 테스트
- [ ] 전체 삭제 플로우 테스트
- [ ] 에러 상황 처리 테스트
- [ ] 롤백 메커니즘 테스트

### 사용자 테스트
- [ ] UI/UX 사용성 테스트
- [ ] 대용량 데이터 삭제 성능 테스트
- [ ] 다양한 운영체제에서 파일 삭제 테스트

---

## ⚠️ 위험 요소 및 대응방안

### 위험 요소
1. **데이터 손실**: 실수로 중요한 세션 삭제
2. **파일 삭제 실패**: 권한 문제나 파일 잠금
3. **데이터 불일치**: DB와 파일 시스템 간 동기화 실패
4. **성능 저하**: 대용량 파일 삭제 시 UI 블로킹

### 대응방안
1. **다중 확인 단계**: 삭제 전 명확한 확인 대화상자
2. **권한 검사**: 삭제 전 파일 접근 권한 확인
3. **트랜잭션 관리**: DB 작업의 원자성 보장
4. **비동기 처리**: 백그라운드에서 삭제 작업 수행

---

## 📊 성공 지표

### 기능적 지표
- [ ] 개별 세션 삭제 성공률 > 99%
- [ ] 다중 세션 삭제 성공률 > 95%
- [ ] 파일-DB 일관성 유지율 > 99%

### 성능 지표
- [ ] 개별 세션 삭제 응답시간 < 2초
- [ ] 10개 세션 일괄 삭제 < 10초
- [ ] UI 응답성 유지 (블로킹 없음)

### 사용성 지표
- [ ] 사용자 실수율 < 5%
- [ ] 삭제 취소 요청율 < 10%
- [ ] 사용자 만족도 > 4.0/5.0

---

## 🔮 향후 개선사항

### 단기 (1-2개월)
- [ ] 휴지통 기능 (임시 삭제)
- [ ] 자동 정리 정책 (오래된 세션 자동 삭제)
- [ ] 삭제 이력 로깅

### 장기 (3-6개월)
- [ ] 클라우드 백업 연동
- [ ] 세션 아카이빙 기능
- [ ] 고급 필터링 및 검색

---

이 기획서를 바탕으로 단계별로 구현을 진행하면 안전하고 효율적인 세션 삭제 기능을 개발할 수 있습니다. 각 단계별로 충분한 테스트를 거쳐 데이터 손실 없이 기능을 제공할 수 있도록 하겠습니다. 