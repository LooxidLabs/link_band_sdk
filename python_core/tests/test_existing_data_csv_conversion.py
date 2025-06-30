#!/usr/bin/env python3
"""
기존 JSON 형식의 센서 데이터를 CSV 형식으로 변환하는 테스트 스크립트
"""

import os
import json
import csv
import sys
from pathlib import Path

# python_core 경로를 sys.path에 추가
current_dir = Path(__file__).parent
python_core_dir = current_dir / "python_core"
sys.path.insert(0, str(python_core_dir))

from app.data.data_recorder import DataRecorder

def convert_json_session_to_csv(json_session_path: str, output_path: str):
    """JSON 형식의 세션을 CSV 형식으로 변환"""
    
    print(f"🔄 JSON 세션을 CSV 형식으로 변환 중...")
    print(f"입력: {json_session_path}")
    print(f"출력: {output_path}")
    
    # 출력 디렉토리 생성
    os.makedirs(output_path, exist_ok=True)
    
    # JSON 파일들 찾기
    json_files = []
    for file in os.listdir(json_session_path):
        if file.endswith('.json') and file != 'meta.json':
            json_files.append(file)
    
    print(f"📁 발견된 JSON 파일: {len(json_files)}개")
    
    # 각 JSON 파일을 CSV로 변환
    for json_file in json_files:
        input_file_path = os.path.join(json_session_path, json_file)
        output_file_name = json_file.replace('.json', '.csv')
        output_file_path = os.path.join(output_path, output_file_name)
        
        print(f"📄 변환 중: {json_file} → {output_file_name}")
        
        try:
            # JSON 파일 읽기
            with open(input_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                print(f"⚠️  빈 데이터: {json_file}")
                continue
            
            # CSV 헤더 생성
            fieldnames = set()
            for sample in data:
                if isinstance(sample, dict):
                    fieldnames.update(sample.keys())
            
            if not fieldnames:
                print(f"⚠️  유효한 필드 없음: {json_file}")
                continue
            
            # 필드명 정렬 (timestamp가 있으면 첫 번째로)
            fieldnames = sorted(list(fieldnames))
            if 'timestamp' in fieldnames:
                fieldnames.remove('timestamp')
                fieldnames.insert(0, 'timestamp')
            
            # CSV 파일 작성
            with open(output_file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for sample in data:
                    if isinstance(sample, dict):
                        row = {field: sample.get(field, '') for field in fieldnames}
                        writer.writerow(row)
            
            # 파일 크기 비교
            json_size = os.path.getsize(input_file_path)
            csv_size = os.path.getsize(output_file_path)
            compression_ratio = (1 - csv_size / json_size) * 100
            
            print(f"✅ 변환 완료: {len(data)}개 샘플")
            print(f"   JSON: {json_size:,} bytes")
            print(f"   CSV:  {csv_size:,} bytes")
            print(f"   압축률: {compression_ratio:.1f}%")
            
        except Exception as e:
            print(f"❌ 변환 실패 {json_file}: {e}")
    
    # 메타데이터도 변환
    meta_json_path = os.path.join(json_session_path, 'meta.json')
    if os.path.exists(meta_json_path):
        print(f"📄 메타데이터 변환 중...")
        
        try:
            with open(meta_json_path, 'r', encoding='utf-8') as f:
                meta_data = json.load(f)
            
            # 메타데이터를 평면화
            flat_meta = flatten_dict(meta_data)
            
            meta_csv_path = os.path.join(output_path, 'meta.csv')
            with open(meta_csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['key', 'value'])
                
                for key, value in flat_meta.items():
                    writer.writerow([key, str(value)])
            
            print(f"✅ 메타데이터 변환 완료: {len(flat_meta)}개 항목")
            
        except Exception as e:
            print(f"❌ 메타데이터 변환 실패: {e}")

def flatten_dict(data, parent_key='', separator='_'):
    """중첩된 딕셔너리를 평면화"""
    items = []
    
    for key, value in data.items():
        new_key = f"{parent_key}{separator}{key}" if parent_key else key
        
        if isinstance(value, dict):
            items.extend(flatten_dict(value, new_key, separator).items())
        elif isinstance(value, list):
            items.append((new_key, json.dumps(value, ensure_ascii=False)))
        else:
            items.append((new_key, value))
    
    return dict(items)

def test_data_recorder_csv_methods():
    """DataRecorder의 CSV 저장 메서드들을 직접 테스트"""
    
    print(f"\n🧪 DataRecorder CSV 메서드 테스트")
    
    # 가상 데이터 생성
    test_samples = [
        {
            "timestamp": 1719728000.0,
            "device_id": "TEST-DEVICE-001",
            "ch1": 123.45,
            "ch2": 124.67,
            "ch3": 125.89,
            "ch4": 126.11,
            "sample_rate": 250
        },
        {
            "timestamp": 1719728000.004,
            "device_id": "TEST-DEVICE-001",
            "ch1": 127.33,
            "ch2": 128.55,
            "ch3": 129.77,
            "ch4": 130.99,
            "sample_rate": 250
        }
    ]
    
    # DataRecorder 인스턴스 생성
    recorder = DataRecorder("./test_output")
    
    # 메타데이터 설정
    recorder.meta = {
        "session_name": "test_csv_methods",
        "data_format": "CSV",
        "start_time": "2024-06-30T06:00:00",
        "end_time": "2024-06-30T06:01:00"
    }
    
    # 세션 디렉토리 설정
    recorder.session_dir = "./test_output/test_csv_methods"
    os.makedirs(recorder.session_dir, exist_ok=True)
    
    # CSV 저장 메서드 테스트
    test_file_path = os.path.join(recorder.session_dir, "test_eeg_data.csv")
    
    try:
        print(f"📄 CSV 저장 테스트: {test_file_path}")
        saved_path = recorder._save_data_as_csv(test_file_path, test_samples)
        print(f"✅ CSV 저장 성공: {saved_path}")
        
        # 파일 내용 확인
        with open(saved_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"📄 CSV 내용 미리보기:")
            print(content[:200] + "..." if len(content) > 200 else content)
        
    except Exception as e:
        print(f"❌ CSV 저장 테스트 실패: {e}")
    
    # 메타데이터 CSV 저장 테스트
    try:
        print(f"\n📄 메타데이터 CSV 저장 테스트")
        recorder._save_meta_as_csv()
        
        meta_csv_path = os.path.join(recorder.session_dir, "meta.csv")
        if os.path.exists(meta_csv_path):
            with open(meta_csv_path, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f"✅ 메타데이터 CSV 저장 성공:")
                print(content)
        
    except Exception as e:
        print(f"❌ 메타데이터 CSV 저장 테스트 실패: {e}")

def main():
    print("🚀 기존 JSON 데이터 CSV 변환 테스트")
    print("=" * 60)
    
    # 실제 센서 데이터가 있는 세션 경로
    json_session_path = "/Users/brian_chae/Library/Application Support/Link Band SDK/Exports/session_2025_06_30_20250630_064551"
    csv_output_path = "./python_core/test_data/csv_converted_session"
    
    if os.path.exists(json_session_path):
        print(f"✅ JSON 세션 발견: {json_session_path}")
        convert_json_session_to_csv(json_session_path, csv_output_path)
        
        print(f"\n📁 변환된 CSV 파일들:")
        if os.path.exists(csv_output_path):
            for file in sorted(os.listdir(csv_output_path)):
                file_path = os.path.join(csv_output_path, file)
                size = os.path.getsize(file_path)
                print(f"   {file}: {size:,} bytes")
    else:
        print(f"❌ JSON 세션을 찾을 수 없음: {json_session_path}")
    
    # DataRecorder 메서드 직접 테스트
    test_data_recorder_csv_methods()
    
    print("\n" + "=" * 60)
    print("🏁 CSV 변환 테스트 완료")

if __name__ == "__main__":
    main() 