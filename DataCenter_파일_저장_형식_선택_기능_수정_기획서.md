# DataCenter 파일 저장 형식 선택 기능 수정 기획서

## 📋 개요

**목표**: DataCenter에서 사용자가 선택한 파일 저장 형식(JSON/CSV)이 실제 저장 시 정확히 반영되도록 수정

**현재 문제**: 사용자가 CSV 형식을 선택해도 실제로는 JSON 형식으로만 저장되는 문제

**우선순위**: High (사용자 경험에 직접적 영향)

## 🔍 문제 분석

### 현재 상황
1. **프론트엔드**: RecordingOptions 컴포넌트에서 JSON/CSV 선택 옵션 제공 ✅
2. **API 전달**: 선택된 형식이 백엔드로 올바르게 전달됨 ✅
3. **백엔드 수신**: recording_service.py에서 data_format 파라미터 수신 ✅
4. **실제 저장**: DataRecorder에서 형식 무시하고 JSON으로만 저장 ❌

### 문제 원인
**파일**: `python_core/app/data/data_recorder.py`
- **175번째 줄**: `filename = f"{data_type}.json"` - 하드코딩된 .json 확장자
- **178번째 줄**: `json.dump(samples, f, ...)` - 항상 JSON 형식으로 저장
- **data_format 파라미터**: start_recording()에서 받지만 실제 저장 시 사용되지 않음

## 🎯 해결 방안

### 핵심 개념
**"사용자 선택 = 실제 저장 형식"** 원칙 구현
- JSON 선택 → .json 파일, JSON 형식 저장
- CSV 선택 → .csv 파일, CSV 형식 저장

### 기술적 접근
1. **동적 파일 확장자**: data_format에 따라 .json/.csv 확장자 결정
2. **형식별 저장 로직**: JSON/CSV 각각의 저장 함수 구현
3. **데이터 구조 변환**: JSON 구조를 CSV 호환 형태로 변환

## 🛠 구현 계획

### Phase 1: 백엔드 DataRecorder 수정

#### 1.1 파일 확장자 동적 처리
```python
# 현재 (data_recorder.py:175)
filename = f"{data_type}.json"

# 수정 후
file_extension = "csv" if self.meta.get("data_format", "JSON").upper() == "CSV" else "json"
filename = f"{data_type}.{file_extension}"
```

#### 1.2 형식별 저장 로직 분리
```python
def _save_data_as_json(self, file_path: str, samples: List[Dict[str, Any]]):
    """JSON 형식으로 데이터 저장"""
    with open(file_path, "w") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)

def _save_data_as_csv(self, file_path: str, samples: List[Dict[str, Any]]):
    """CSV 형식으로 데이터 저장"""
    if not samples:
        return
    
    # CSV 헤더 생성
    fieldnames = set()
    for sample in samples:
        fieldnames.update(sample.keys())
    fieldnames = sorted(list(fieldnames))
    
    with open(file_path, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(samples)
```

#### 1.3 stop_recording() 메서드 수정
```python
# 현재 저장 로직 (data_recorder.py:178)
with open(file_path, "w") as f:
    json.dump(samples, f, ensure_ascii=False, indent=2)

# 수정 후
data_format = self.meta.get("data_format", "JSON").upper()
if data_format == "CSV":
    self._save_data_as_csv(file_path, samples)
else:
    self._save_data_as_json(file_path, samples)
```

### Phase 2: CSV 구조 최적화

#### 2.1 센서 데이터 CSV 구조 설계
```csv
# EEG 데이터 예시 (device_eeg_raw.csv)
timestamp,device_id,ch1,ch2,ch3,ch4,sample_rate
1704110400.0,015F2A8E-3772-FB6D-2197-548F305983B0,123.45,124.67,125.89,126.11,250
1704110400.004,015F2A8E-3772-FB6D-2197-548F305983B0,127.33,128.55,129.77,130.99,250

# PPG 데이터 예시 (device_ppg_raw.csv)
timestamp,device_id,ppg_value,sample_rate
1704110400.0,015F2A8E-3772-FB6D-2197-548F305983B0,345.67,125
1704110400.008,015F2A8E-3772-FB6D-2197-548F305983B0,346.89,125
```

#### 2.2 메타데이터 CSV 지원
```csv
# meta.csv
key,value
session_name,session_20241225_143022
start_time,2024-12-25T14:30:22.123456
end_time,2024-12-25T14:35:45.789012
data_format,CSV
export_path,/Users/username/data
total_files,6
total_records,15000
```

### Phase 3: 에러 처리 및 검증

#### 3.1 CSV 변환 에러 처리
```python
def _save_data_as_csv(self, file_path: str, samples: List[Dict[str, Any]]):
    try:
        # CSV 저장 로직
        pass
    except Exception as e:
        logger.error(f"CSV 저장 실패, JSON으로 대체 저장: {e}")
        # Fallback to JSON
        json_path = file_path.replace('.csv', '.json')
        self._save_data_as_json(json_path, samples)
        return json_path
    return file_path
```

#### 3.2 파일 무결성 검증
```python
def _verify_saved_file(self, file_path: str, expected_records: int) -> bool:
    """저장된 파일의 무결성 검증"""
    try:
        if file_path.endswith('.csv'):
            return self._verify_csv_file(file_path, expected_records)
        else:
            return self._verify_json_file(file_path, expected_records)
    except Exception as e:
        logger.error(f"파일 검증 실패: {e}")
        return False
```

## 📋 상세 구현 내용

### 1. 필요한 import 추가
```python
# data_recorder.py 상단에 추가
import csv
from typing import List, Dict, Any, Optional
```

### 2. DataRecorder 클래스 메서드 추가
```python
def _get_file_extension(self) -> str:
    """설정된 데이터 형식에 따른 파일 확장자 반환"""
    data_format = self.meta.get("data_format", "JSON").upper()
    return "csv" if data_format == "CSV" else "json"

def _save_data_by_format(self, file_path: str, samples: List[Dict[str, Any]]) -> str:
    """설정된 형식에 따라 데이터 저장"""
    data_format = self.meta.get("data_format", "JSON").upper()
    
    if data_format == "CSV":
        return self._save_data_as_csv(file_path, samples)
    else:
        return self._save_data_as_json(file_path, samples)
```

### 3. 핵심 수정 사항
**파일**: `python_core/app/data/data_recorder.py`
**메서드**: `stop_recording()` (약 175번째 줄)

```python
# 현재 코드
filename = f"{data_type.replace(':', '_').replace('/', '_')}.json"
file_path = os.path.join(self.session_dir, filename)

with open(file_path, "w") as f:
    json.dump(samples, f, ensure_ascii=False, indent=2)

# 수정 후 코드
file_extension = self._get_file_extension()
filename = f"{data_type.replace(':', '_').replace('/', '_')}.{file_extension}"
file_path = os.path.join(self.session_dir, filename)

# 형식에 따른 저장
saved_file_path = self._save_data_by_format(file_path, samples)
```

## 🧪 테스트 계획

### 테스트 시나리오

#### 1. JSON 형식 저장 테스트
```javascript
// test_json_format.js
const testData = {
  session_name: "test_json_session",
  settings: {
    data_format: "json",
    export_path: "./test_data"
  }
};

// 예상 결과: .json 파일들 생성, JSON 형식 내용
```

#### 2. CSV 형식 저장 테스트
```javascript
// test_csv_format.js
const testData = {
  session_name: "test_csv_session", 
  settings: {
    data_format: "csv",
    export_path: "./test_data"
  }
};

// 예상 결과: .csv 파일들 생성, CSV 형식 내용
```

#### 3. 형식 전환 테스트
```javascript
// 동일 세션에서 JSON → CSV 전환 테스트
// 서로 다른 세션에서 형식별 저장 테스트
```

### 검증 항목
- [ ] JSON 선택 시 .json 파일 생성 확인
- [ ] CSV 선택 시 .csv 파일 생성 확인
- [ ] 파일 내용이 선택한 형식과 일치하는지 확인
- [ ] 메타데이터에 올바른 형식 정보 저장 확인
- [ ] 에러 발생 시 Fallback 동작 확인
- [ ] 파일 크기 및 성능 비교 (JSON vs CSV)

## 📊 예상 효과

### 사용자 경험 개선
- **직관성 향상**: 선택한 형식으로 실제 저장됨
- **분석 도구 호환성**: CSV 선택 시 Excel, R, Python pandas 등에서 직접 사용 가능
- **파일 크기 최적화**: CSV가 일반적으로 JSON보다 작은 파일 크기

### 기술적 이점
- **데이터 호환성**: 다양한 분석 도구와의 호환성 확보
- **저장 공간 효율성**: CSV 형식의 공간 효율성 활용
- **사용자 선택권**: 용도에 따른 형식 선택 가능

## ⚠️ 주의사항

### 1. 하위 호환성
- 기존 JSON 형식으로 저장된 데이터는 그대로 유지
- 새로운 세션부터 선택된 형식 적용

### 2. CSV 제한사항
- 중첩된 JSON 구조는 평면화 필요
- 복잡한 메타데이터는 별도 처리 필요

### 3. 성능 고려사항
- 대용량 데이터 처리 시 메모리 사용량 모니터링
- CSV 변환 과정에서의 추가 처리 시간

## 📅 개발 일정

### Week 1: 백엔드 수정
- [ ] DataRecorder 클래스 수정
- [ ] CSV 저장 로직 구현
- [ ] 단위 테스트 작성

### Week 2: 통합 테스트
- [ ] 프론트엔드-백엔드 통합 테스트
- [ ] 다양한 센서 데이터 형식 테스트
- [ ] 에러 처리 시나리오 테스트

### Week 3: 최적화 및 배포
- [ ] 성능 최적화
- [ ] 문서 업데이트
- [ ] 배포 및 검증

## 🔧 구현 우선순위

1. **High**: 기본 CSV 저장 기능 구현
2. **Medium**: 에러 처리 및 Fallback 로직
3. **Low**: 성능 최적화 및 고급 CSV 기능

---

**작성자**: AI Assistant  
**작성일**: 2024-12-25  
**문서 버전**: v1.0  
**관련 이슈**: DataCenter CSV 저장 기능 구현 