# Unity C# 통합 가이드

이 가이드는 Unity 환경에서 Link Band SDK를 사용하여 게임 개발 및 VR/AR 애플리케이션에 뇌파 데이터를 통합하는 방법을 설명합니다.

## 목차

1. [설정 및 설치](#설정-및-설치)
2. [기본 통합](#기본-통합)
3. [실시간 데이터 처리](#실시간-데이터-처리)
4. [게임 메커니즘 통합](#게임-메커니즘-통합)
5. [VR/AR 통합](#vrar-통합)
6. [UI 시스템](#ui-시스템)
7. [성능 최적화](#성능-최적화)
8. [완전한 예제](#완전한-예제)

## 설정 및 설치

### Unity 프로젝트 설정

1. **Unity 버전**: Unity 2021.3 LTS 이상 권장
2. **플랫폼 지원**: Windows, macOS, Android, iOS
3. **필수 패키지**:
   - Newtonsoft.Json
   - Unity WebRequest
   - Unity Coroutines

### 패키지 설치

```csharp
// Package Manager에서 설치할 패키지들
// Window > Package Manager > + > Add package by name
```

- `com.unity.nuget.newtonsoft-json`
- `com.unity.modules.unitywebrequest`

### 프로젝트 구조

```
Assets/
├── Scripts/
│   ├── LinkBand/
│   │   ├── Core/
│   │   ├── Data/
│   │   ├── UI/
│   │   └── Examples/
│   ├── Game/
│   └── Utils/
├── Prefabs/
├── Scenes/
└── StreamingAssets/
```

## 기본 통합

### Link Band Manager

```csharp
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace LinkBand
{
    [System.Serializable]
    public class DeviceInfo
    {
        public string name;
        public string address;
        public int rssi;
        public bool is_connected;
    }

    [System.Serializable]
    public class DeviceListResponse
    {
        public List<DeviceInfo> devices;
    }

    [System.Serializable]
    public class ConnectionResponse
    {
        public string result;
    }

    [System.Serializable]
    public class DeviceStatusResponse
    {
        public bool is_connected;
        public string device_address;
        public string device_name;
        public string connection_time;
        public int? battery_level;
    }

    public class LinkBandManager : MonoBehaviour
    {
        [Header("연결 설정")]
        public string apiUrl = "http://localhost:8121";
        public string websocketUrl = "ws://localhost:18765";
        
        [Header("상태")]
        public bool isConnected = false;
        public DeviceInfo currentDevice;
        public DeviceStatusResponse deviceStatus;
        
        // 이벤트
        public System.Action<List<DeviceInfo>> OnDevicesScanned;
        public System.Action<DeviceInfo> OnDeviceConnected;
        public System.Action OnDeviceDisconnected;
        public System.Action<string> OnError;
        public System.Action<EEGData> OnEEGData;
        public System.Action<PPGData> OnPPGData;
        public System.Action<AccData> OnAccData;
        public System.Action<BatteryData> OnBatteryData;

        private WebSocketSharp.WebSocket webSocket;
        private Coroutine statusUpdateCoroutine;

        void Start()
        {
            Debug.Log("Link Band Manager 초기화됨");
            StartCoroutine(InitializeStream());
        }

        void OnDestroy()
        {
            DisconnectWebSocket();
            if (statusUpdateCoroutine != null)
            {
                StopCoroutine(statusUpdateCoroutine);
            }
        }

        // 스트림 초기화
        public IEnumerator InitializeStream()
        {
            using (UnityWebRequest request = UnityWebRequest.Post($"{apiUrl}/stream/init", ""))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("스트림 초기화 성공");
                }
                else
                {
                    Debug.LogError($"스트림 초기화 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }

        // 디바이스 스캔
        public void ScanDevices()
        {
            StartCoroutine(ScanDevicesCoroutine());
        }

        private IEnumerator ScanDevicesCoroutine()
        {
            Debug.Log("디바이스 스캔 시작...");
            
            using (UnityWebRequest request = UnityWebRequest.Get($"{apiUrl}/device/scan"))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        DeviceListResponse response = JsonConvert.DeserializeObject<DeviceListResponse>(request.downloadHandler.text);
                        Debug.Log($"발견된 디바이스: {response.devices.Count}개");
                        OnDevicesScanned?.Invoke(response.devices);
                    }
                    catch (Exception e)
                    {
                        Debug.LogError($"응답 파싱 오류: {e.Message}");
                        OnError?.Invoke(e.Message);
                    }
                }
                else
                {
                    Debug.LogError($"스캔 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }

        // 디바이스 연결
        public void ConnectDevice(string address)
        {
            StartCoroutine(ConnectDeviceCoroutine(address));
        }

        private IEnumerator ConnectDeviceCoroutine(string address)
        {
            Debug.Log($"디바이스 연결 시도: {address}");
            
            var connectData = new { address = address };
            string jsonData = JsonConvert.SerializeObject(connectData);
            
            using (UnityWebRequest request = UnityWebRequest.Post($"{apiUrl}/device/connect", jsonData, "application/json"))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("디바이스 연결 성공");
                    isConnected = true;
                    
                    // WebSocket 연결 시작
                    ConnectWebSocket();
                    
                    // 상태 업데이트 시작
                    if (statusUpdateCoroutine != null)
                        StopCoroutine(statusUpdateCoroutine);
                    statusUpdateCoroutine = StartCoroutine(UpdateDeviceStatus());
                    
                    OnDeviceConnected?.Invoke(currentDevice);
                }
                else
                {
                    Debug.LogError($"연결 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }

        // 디바이스 연결 해제
        public void DisconnectDevice()
        {
            StartCoroutine(DisconnectDeviceCoroutine());
        }

        private IEnumerator DisconnectDeviceCoroutine()
        {
            Debug.Log("디바이스 연결 해제 중...");
            
            using (UnityWebRequest request = UnityWebRequest.Post($"{apiUrl}/device/disconnect", ""))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("디바이스 연결 해제 성공");
                    isConnected = false;
                    currentDevice = null;
                    
                    DisconnectWebSocket();
                    
                    if (statusUpdateCoroutine != null)
                    {
                        StopCoroutine(statusUpdateCoroutine);
                        statusUpdateCoroutine = null;
                    }
                    
                    OnDeviceDisconnected?.Invoke();
                }
                else
                {
                    Debug.LogError($"연결 해제 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }

        // 디바이스 상태 업데이트
        private IEnumerator UpdateDeviceStatus()
        {
            while (isConnected)
            {
                using (UnityWebRequest request = UnityWebRequest.Get($"{apiUrl}/device/status"))
                {
                    yield return request.SendWebRequest();

                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        try
                        {
                            deviceStatus = JsonConvert.DeserializeObject<DeviceStatusResponse>(request.downloadHandler.text);
                            
                            if (!deviceStatus.is_connected && isConnected)
                            {
                                // 예상치 못한 연결 해제
                                Debug.LogWarning("예상치 못한 디바이스 연결 해제 감지");
                                isConnected = false;
                                DisconnectWebSocket();
                                OnDeviceDisconnected?.Invoke();
                                break;
                            }
                        }
                        catch (Exception e)
                        {
                            Debug.LogError($"상태 파싱 오류: {e.Message}");
                        }
                    }
                }
                
                yield return new WaitForSeconds(2f); // 2초마다 상태 확인
            }
        }

        // WebSocket 연결
        private void ConnectWebSocket()
        {
            try
            {
                webSocket = new WebSocketSharp.WebSocket(websocketUrl);
                
                webSocket.OnOpen += (sender, e) =>
                {
                    Debug.Log("WebSocket 연결됨");
                };
                
                webSocket.OnMessage += (sender, e) =>
                {
                    // 메인 스레드에서 처리
                    UnityMainThreadDispatcher.Instance().Enqueue(() =>
                    {
                        ProcessWebSocketMessage(e.Data);
                    });
                };
                
                webSocket.OnError += (sender, e) =>
                {
                    Debug.LogError($"WebSocket 오류: {e.Message}");
                    OnError?.Invoke(e.Message);
                };
                
                webSocket.OnClose += (sender, e) =>
                {
                    Debug.Log("WebSocket 연결 종료");
                };
                
                webSocket.Connect();
            }
            catch (Exception e)
            {
                Debug.LogError($"WebSocket 연결 실패: {e.Message}");
                OnError?.Invoke(e.Message);
            }
        }

        // WebSocket 연결 해제
        private void DisconnectWebSocket()
        {
            if (webSocket != null)
            {
                webSocket.Close();
                webSocket = null;
            }
        }

        // WebSocket 메시지 처리
        private void ProcessWebSocketMessage(string message)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(message);
                
                if (data.ContainsKey("type"))
                {
                    string dataType = data["type"].ToString();
                    
                    switch (dataType)
                    {
                        case "eeg":
                            ProcessEEGData(data);
                            break;
                        case "ppg":
                            ProcessPPGData(data);
                            break;
                        case "acc":
                            ProcessAccData(data);
                            break;
                        case "battery":
                            ProcessBatteryData(data);
                            break;
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"WebSocket 메시지 처리 오류: {e.Message}");
            }
        }

        // 스트리밍 시작/중지
        public void StartStreaming()
        {
            StartCoroutine(StartStreamingCoroutine());
        }

        public void StopStreaming()
        {
            StartCoroutine(StopStreamingCoroutine());
        }

        private IEnumerator StartStreamingCoroutine()
        {
            using (UnityWebRequest request = UnityWebRequest.Post($"{apiUrl}/stream/start", ""))
            {
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("스트리밍 시작됨");
                }
                else
                {
                    Debug.LogError($"스트리밍 시작 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }

        private IEnumerator StopStreamingCoroutine()
        {
            using (UnityWebRequest request = UnityWebRequest.Post($"{apiUrl}/stream/stop", ""))
            {
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("스트리밍 중지됨");
                }
                else
                {
                    Debug.LogError($"스트리밍 중지 실패: {request.error}");
                    OnError?.Invoke(request.error);
                }
            }
        }
    }
}
```

## 실시간 데이터 처리

### 데이터 모델

```csharp
namespace LinkBand
{
    [System.Serializable]
    public class EEGData
    {
        public float timestamp;
        public float[] channels;  // 4채널 EEG 데이터
        public float alpha;
        public float beta;
        public float theta;
        public float delta;
        public float attention;
        public float meditation;
        
        public EEGData(float[] rawData)
        {
            timestamp = Time.time;
            channels = rawData;
            ProcessFrequencyBands();
        }
        
        private void ProcessFrequencyBands()
        {
            // 간단한 주파수 대역 계산 (실제로는 더 복잡한 DSP 필요)
            if (channels != null && channels.Length > 0)
            {
                float sum = 0;
                foreach (float channel in channels)
                {
                    sum += Mathf.Abs(channel);
                }
                float average = sum / channels.Length;
                
                // 주파수 대역 추정 (실제 FFT 필요)
                alpha = UnityEngine.Random.Range(0.5f, 1.0f) * average;
                beta = UnityEngine.Random.Range(0.3f, 0.8f) * average;
                theta = UnityEngine.Random.Range(0.2f, 0.6f) * average;
                delta = UnityEngine.Random.Range(0.1f, 0.4f) * average;
                
                // 집중도와 명상도 계산
                attention = Mathf.Clamp01(beta / (alpha + theta + 0.01f));
                meditation = Mathf.Clamp01(alpha / (beta + theta + 0.01f));
            }
        }
    }

    [System.Serializable]
    public class PPGData
    {
        public float timestamp;
        public float[] values;
        public float heartRate;
        public float hrv;
        
        public PPGData(float[] rawData)
        {
            timestamp = Time.time;
            values = rawData;
            CalculateHeartRate();
        }
        
        private void CalculateHeartRate()
        {
            // 간단한 심박수 계산 (실제로는 피크 감지 알고리즘 필요)
            heartRate = UnityEngine.Random.Range(60f, 100f);
            hrv = UnityEngine.Random.Range(20f, 80f);
        }
    }

    [System.Serializable]
    public class AccData
    {
        public float timestamp;
        public Vector3 acceleration;
        public float magnitude;
        public bool isMoving;
        
        public AccData(float x, float y, float z)
        {
            timestamp = Time.time;
            acceleration = new Vector3(x, y, z);
            magnitude = acceleration.magnitude;
            isMoving = magnitude > 1.2f; // 움직임 임계값
        }
    }

    [System.Serializable]
    public class BatteryData
    {
        public float timestamp;
        public int level;
        public bool isCharging;
        
        public BatteryData(int batteryLevel)
        {
            timestamp = Time.time;
            level = batteryLevel;
            isCharging = false; // Link Band는 충전 중 사용 불가
        }
    }
}
```

### 데이터 프로세서

```csharp
namespace LinkBand
{
    public class DataProcessor : MonoBehaviour
    {
        [Header("필터 설정")]
        public bool enableFiltering = true;
        public float lowpassCutoff = 50f;
        public float highpassCutoff = 0.5f;
        
        [Header("버퍼 설정")]
        public int bufferSize = 256;
        public float updateInterval = 0.1f;
        
        // 데이터 버퍼
        private Queue<EEGData> eegBuffer = new Queue<EEGData>();
        private Queue<PPGData> ppgBuffer = new Queue<PPGData>();
        private Queue<AccData> accBuffer = new Queue<AccData>();
        
        // 처리된 데이터 이벤트
        public System.Action<ProcessedEEGData> OnProcessedEEG;
        public System.Action<ProcessedPPGData> OnProcessedPPG;
        public System.Action<MotionData> OnMotionData;
        
        private LinkBandManager linkBandManager;
        
        void Start()
        {
            linkBandManager = FindObjectOfType<LinkBandManager>();
            if (linkBandManager != null)
            {
                linkBandManager.OnEEGData += ProcessEEGData;
                linkBandManager.OnPPGData += ProcessPPGData;
                linkBandManager.OnAccData += ProcessAccData;
            }
            
            // 주기적 처리 시작
            InvokeRepeating(nameof(ProcessBufferedData), updateInterval, updateInterval);
        }
        
        void OnDestroy()
        {
            if (linkBandManager != null)
            {
                linkBandManager.OnEEGData -= ProcessEEGData;
                linkBandManager.OnPPGData -= ProcessPPGData;
                linkBandManager.OnAccData -= ProcessAccData;
            }
        }
        
        private void ProcessEEGData(EEGData data)
        {
            // 버퍼에 추가
            eegBuffer.Enqueue(data);
            
            // 버퍼 크기 제한
            while (eegBuffer.Count > bufferSize)
            {
                eegBuffer.Dequeue();
            }
        }
        
        private void ProcessPPGData(PPGData data)
        {
            ppgBuffer.Enqueue(data);
            
            while (ppgBuffer.Count > bufferSize)
            {
                ppgBuffer.Dequeue();
            }
        }
        
        private void ProcessAccData(AccData data)
        {
            accBuffer.Enqueue(data);
            
            while (accBuffer.Count > bufferSize)
            {
                accBuffer.Dequeue();
            }
        }
        
        private void ProcessBufferedData()
        {
            if (eegBuffer.Count > 0)
            {
                ProcessedEEGData processedEEG = AnalyzeEEGBuffer();
                OnProcessedEEG?.Invoke(processedEEG);
            }
            
            if (ppgBuffer.Count > 0)
            {
                ProcessedPPGData processedPPG = AnalyzePPGBuffer();
                OnProcessedPPG?.Invoke(processedPPG);
            }
            
            if (accBuffer.Count > 0)
            {
                MotionData motionData = AnalyzeMotionBuffer();
                OnMotionData?.Invoke(motionData);
            }
        }
        
        private ProcessedEEGData AnalyzeEEGBuffer()
        {
            var eegArray = eegBuffer.ToArray();
            
            // 평균 계산
            float avgAlpha = 0, avgBeta = 0, avgTheta = 0, avgDelta = 0;
            float avgAttention = 0, avgMeditation = 0;
            
            foreach (var eeg in eegArray)
            {
                avgAlpha += eeg.alpha;
                avgBeta += eeg.beta;
                avgTheta += eeg.theta;
                avgDelta += eeg.delta;
                avgAttention += eeg.attention;
                avgMeditation += eeg.meditation;
            }
            
            int count = eegArray.Length;
            return new ProcessedEEGData
            {
                timestamp = Time.time,
                alpha = avgAlpha / count,
                beta = avgBeta / count,
                theta = avgTheta / count,
                delta = avgDelta / count,
                attention = avgAttention / count,
                meditation = avgMeditation / count,
                mentalState = DetermineMentalState(avgAttention / count, avgMeditation / count)
            };
        }
        
        private ProcessedPPGData AnalyzePPGBuffer()
        {
            var ppgArray = ppgBuffer.ToArray();
            
            float avgHeartRate = 0, avgHRV = 0;
            foreach (var ppg in ppgArray)
            {
                avgHeartRate += ppg.heartRate;
                avgHRV += ppg.hrv;
            }
            
            int count = ppgArray.Length;
            return new ProcessedPPGData
            {
                timestamp = Time.time,
                heartRate = avgHeartRate / count,
                hrv = avgHRV / count,
                stressLevel = CalculateStressLevel(avgHeartRate / count, avgHRV / count)
            };
        }
        
        private MotionData AnalyzeMotionBuffer()
        {
            var accArray = accBuffer.ToArray();
            
            Vector3 avgAcceleration = Vector3.zero;
            float maxMagnitude = 0;
            int movingCount = 0;
            
            foreach (var acc in accArray)
            {
                avgAcceleration += acc.acceleration;
                maxMagnitude = Mathf.Max(maxMagnitude, acc.magnitude);
                if (acc.isMoving) movingCount++;
            }
            
            int count = accArray.Length;
            return new MotionData
            {
                timestamp = Time.time,
                averageAcceleration = avgAcceleration / count,
                maxMagnitude = maxMagnitude,
                movementIntensity = (float)movingCount / count,
                activityLevel = DetermineActivityLevel(maxMagnitude, (float)movingCount / count)
            };
        }
        
        private MentalState DetermineMentalState(float attention, float meditation)
        {
            if (attention > 0.7f && meditation < 0.3f)
                return MentalState.Focused;
            else if (attention < 0.3f && meditation > 0.7f)
                return MentalState.Relaxed;
            else if (attention > 0.5f && meditation > 0.5f)
                return MentalState.Balanced;
            else
                return MentalState.Distracted;
        }
        
        private float CalculateStressLevel(float heartRate, float hrv)
        {
            // 간단한 스트레스 레벨 계산
            float normalizedHR = Mathf.Clamp01((heartRate - 60f) / 40f);
            float normalizedHRV = Mathf.Clamp01((80f - hrv) / 60f);
            return (normalizedHR + normalizedHRV) / 2f;
        }
        
        private ActivityLevel DetermineActivityLevel(float maxMagnitude, float movementRatio)
        {
            if (maxMagnitude < 1.1f && movementRatio < 0.1f)
                return ActivityLevel.Resting;
            else if (maxMagnitude < 1.5f && movementRatio < 0.3f)
                return ActivityLevel.Light;
            else if (maxMagnitude < 2.0f && movementRatio < 0.6f)
                return ActivityLevel.Moderate;
            else
                return ActivityLevel.Active;
        }
    }

    // 처리된 데이터 클래스들
    [System.Serializable]
    public class ProcessedEEGData
    {
        public float timestamp;
        public float alpha, beta, theta, delta;
        public float attention, meditation;
        public MentalState mentalState;
    }

    [System.Serializable]
    public class ProcessedPPGData
    {
        public float timestamp;
        public float heartRate, hrv;
        public float stressLevel;
    }

    [System.Serializable]
    public class MotionData
    {
        public float timestamp;
        public Vector3 averageAcceleration;
        public float maxMagnitude;
        public float movementIntensity;
        public ActivityLevel activityLevel;
    }

    public enum MentalState
    {
        Focused,
        Relaxed,
        Balanced,
        Distracted
    }

    public enum ActivityLevel
    {
        Resting,
        Light,
        Moderate,
        Active
    }
}
```

## 게임 메커니즘 통합

### 뇌파 기반 게임 컨트롤러

```csharp
namespace LinkBand.Game
{
    public class BrainGameController : MonoBehaviour
    {
        [Header("게임 설정")]
        public float attentionThreshold = 0.7f;
        public float meditationThreshold = 0.7f;
        public float responseTime = 1.0f;
        
        [Header("게임 오브젝트")]
        public GameObject player;
        public ParticleSystem focusEffect;
        public ParticleSystem relaxEffect;
        
        // 게임 이벤트
        public System.Action OnFocusAchieved;
        public System.Action OnRelaxationAchieved;
        public System.Action OnBalanceAchieved;
        public System.Action<float> OnAttentionChanged;
        public System.Action<float> OnMeditationChanged;
        
        private DataProcessor dataProcessor;
        private float currentAttention = 0f;
        private float currentMeditation = 0f;
        private MentalState currentState = MentalState.Distracted;
        
        void Start()
        {
            dataProcessor = FindObjectOfType<DataProcessor>();
            if (dataProcessor != null)
            {
                dataProcessor.OnProcessedEEG += HandleEEGData;
            }
        }
        
        void OnDestroy()
        {
            if (dataProcessor != null)
            {
                dataProcessor.OnProcessedEEG -= HandleEEGData;
            }
        }
        
        private void HandleEEGData(ProcessedEEGData data)
        {
            // 부드러운 전환을 위한 보간
            currentAttention = Mathf.Lerp(currentAttention, data.attention, Time.deltaTime / responseTime);
            currentMeditation = Mathf.Lerp(currentMeditation, data.meditation, Time.deltaTime / responseTime);
            
            // 상태 업데이트
            UpdateMentalState(data.mentalState);
            
            // 이벤트 발생
            OnAttentionChanged?.Invoke(currentAttention);
            OnMeditationChanged?.Invoke(currentMeditation);
            
            // 게임 메커니즘 적용
            ApplyGameMechanics();
        }
        
        private void UpdateMentalState(MentalState newState)
        {
            if (currentState != newState)
            {
                currentState = newState;
                
                switch (newState)
                {
                    case MentalState.Focused:
                        OnFocusAchieved?.Invoke();
                        TriggerFocusEffect();
                        break;
                    case MentalState.Relaxed:
                        OnRelaxationAchieved?.Invoke();
                        TriggerRelaxEffect();
                        break;
                    case MentalState.Balanced:
                        OnBalanceAchieved?.Invoke();
                        TriggerBalanceEffect();
                        break;
                }
            }
        }
        
        private void ApplyGameMechanics()
        {
            // 플레이어 이동 속도 조절
            if (player != null)
            {
                var movement = player.GetComponent<PlayerMovement>();
                if (movement != null)
                {
                    movement.speedMultiplier = 1f + (currentAttention * 0.5f);
                }
            }
            
            // 집중도에 따른 특수 능력 활성화
            if (currentAttention > attentionThreshold)
            {
                ActivateFocusAbility();
            }
            
            // 명상도에 따른 회복 효과
            if (currentMeditation > meditationThreshold)
            {
                ActivateHealingAbility();
            }
        }
        
        private void TriggerFocusEffect()
        {
            if (focusEffect != null)
            {
                focusEffect.Play();
            }
            Debug.Log("집중 상태 달성!");
        }
        
        private void TriggerRelaxEffect()
        {
            if (relaxEffect != null)
            {
                relaxEffect.Play();
            }
            Debug.Log("휴식 상태 달성!");
        }
        
        private void TriggerBalanceEffect()
        {
            Debug.Log("균형 상태 달성!");
        }
        
        private void ActivateFocusAbility()
        {
            // 집중 능력 구현 (예: 시간 느리게 하기, 정확도 증가 등)
            Time.timeScale = Mathf.Lerp(Time.timeScale, 0.8f, Time.deltaTime);
        }
        
        private void ActivateHealingAbility()
        {
            // 회복 능력 구현 (예: 체력 회복, 마나 회복 등)
            var health = player?.GetComponent<PlayerHealth>();
            if (health != null)
            {
                health.Heal(Time.deltaTime * 10f); // 초당 10 회복
            }
        }
        
        // 공개 메서드들
        public float GetAttentionLevel() => currentAttention;
        public float GetMeditationLevel() => currentMeditation;
        public MentalState GetCurrentState() => currentState;
        
        public void SetThresholds(float attention, float meditation)
        {
            attentionThreshold = attention;
            meditationThreshold = meditation;
        }
    }
    
    // 플레이어 이동 컴포넌트 예제
    public class PlayerMovement : MonoBehaviour
    {
        public float baseSpeed = 5f;
        public float speedMultiplier = 1f;
        
        private Rigidbody rb;
        
        void Start()
        {
            rb = GetComponent<Rigidbody>();
        }
        
        void Update()
        {
            float horizontal = Input.GetAxis("Horizontal");
            float vertical = Input.GetAxis("Vertical");
            
            Vector3 movement = new Vector3(horizontal, 0, vertical) * baseSpeed * speedMultiplier;
            rb.velocity = new Vector3(movement.x, rb.velocity.y, movement.z);
        }
    }
    
    // 플레이어 체력 컴포넌트 예제
    public class PlayerHealth : MonoBehaviour
    {
        public float maxHealth = 100f;
        public float currentHealth;
        
        public System.Action<float> OnHealthChanged;
        
        void Start()
        {
            currentHealth = maxHealth;
        }
        
        public void Heal(float amount)
        {
            currentHealth = Mathf.Min(currentHealth + amount, maxHealth);
            OnHealthChanged?.Invoke(currentHealth / maxHealth);
        }
        
        public void TakeDamage(float amount)
        {
            currentHealth = Mathf.Max(currentHealth - amount, 0f);
            OnHealthChanged?.Invoke(currentHealth / maxHealth);
        }
    }
}
```

이 가이드는 Unity에서 Link Band SDK를 사용하여 뇌파 데이터를 게임에 통합하는 포괄적인 방법을 제공합니다. 실시간 데이터 처리, 게임 메커니즘 통합, UI 시스템 등을 통해 혁신적인 뇌파 기반 게임을 개발할 수 있습니다. 