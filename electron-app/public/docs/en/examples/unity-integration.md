# Unity Integration Guide

This guide demonstrates how to integrate the Link Band SDK with Unity applications for game development, VR/AR experiences, and interactive applications.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Link Band Manager](#link-band-manager)
3. [Data Visualization](#data-visualization)
4. [Game Integration](#game-integration)
5. [VR/AR Integration](#vrar-integration)
6. [Complete Example](#complete-example)

## Setup & Configuration

### Prerequisites

- Unity 2021.3 LTS or later
- Newtonsoft.Json package
- UnityWebRequest for HTTP calls
- WebSocket-Sharp (optional, for WebSocket support)

### Package Installation

```json
// Packages/manifest.json
{
  "dependencies": {
    "com.unity.nuget.newtonsoft-json": "3.0.2",
    "com.unity.netcode.gameobjects": "1.5.2"
  }
}
```

## Link Band Manager

### Core Link Band Manager Script

```csharp
// Scripts/LinkBandManager.cs
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;
using System.Threading.Tasks;

[System.Serializable]
public class Device
{
    public string name;
    public string address;
    public int rssi;
    public bool is_connected;
}

[System.Serializable]
public class StreamData
{
    public float timestamp;
    public float[] eeg;
    public float[] ppg;
    public AccelerometerData acc;
    public float battery;
}

[System.Serializable]
public class AccelerometerData
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class DeviceResponse
{
    public List<Device> devices;
}

public class LinkBandManager : MonoBehaviour
{
    [Header("Configuration")]
    public string apiUrl = "http://localhost:8121";
    public string websocketUrl = "ws://localhost:18765";
    
    [Header("Status")]
    public bool isConnected = false;
    public bool isStreaming = false;
    public Device connectedDevice;
    
    [Header("Events")]
    public UnityEngine.Events.UnityEvent OnDeviceConnected;
    public UnityEngine.Events.UnityEvent OnDeviceDisconnected;
    public UnityEngine.Events.UnityEvent OnStreamingStarted;
    public UnityEngine.Events.UnityEvent OnStreamingStopped;
    public StreamDataEvent OnDataReceived;
    
    // WebSocket connection
    private WebSocketSharp.WebSocket webSocket;
    private Queue<StreamData> dataQueue = new Queue<StreamData>();
    private readonly object queueLock = new object();
    
    // Singleton instance
    public static LinkBandManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void Start()
    {
        StartCoroutine(ProcessDataQueue());
    }
    
    private void OnDestroy()
    {
        if (webSocket != null && webSocket.IsAlive)
        {
            webSocket.Close();
        }
    }
    
    // Device Management
    public async Task<List<Device>> ScanDevicesAsync()
    {
        string url = $"{apiUrl}/device/scan";
        
        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            var operation = request.SendWebRequest();
            
            while (!operation.isDone)
            {
                await Task.Yield();
            }
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonConvert.DeserializeObject<DeviceResponse>(request.downloadHandler.text);
                return response.devices ?? new List<Device>();
            }
            else
            {
                Debug.LogError($"Failed to scan devices: {request.error}");
                return new List<Device>();
            }
        }
    }
    
    public async Task<bool> ConnectDeviceAsync(string address)
    {
        string url = $"{apiUrl}/device/connect";
        string jsonData = JsonConvert.SerializeObject(new { address = address });
        
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            var operation = request.SendWebRequest();
            
            while (!operation.isDone)
            {
                await Task.Yield();
            }
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                isConnected = true;
                OnDeviceConnected?.Invoke();
                Debug.Log($"Device connected: {address}");
                return true;
            }
            else
            {
                Debug.LogError($"Failed to connect device: {request.error}");
                return false;
            }
        }
    }
    
    public async Task<bool> DisconnectDeviceAsync()
    {
        string url = $"{apiUrl}/device/disconnect";
        
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            
            var operation = request.SendWebRequest();
            
            while (!operation.isDone)
            {
                await Task.Yield();
            }
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                isConnected = false;
                OnDeviceDisconnected?.Invoke();
                Debug.Log("Device disconnected");
                return true;
            }
            else
            {
                Debug.LogError($"Failed to disconnect device: {request.error}");
                return false;
            }
        }
    }
    
    // Streaming Management
    public async Task<bool> StartStreamingAsync()
    {
        // Initialize stream
        await InitializeStreamAsync();
        
        string url = $"{apiUrl}/stream/start";
        
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            
            var operation = request.SendWebRequest();
            
            while (!operation.isDone)
            {
                await Task.Yield();
            }
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                isStreaming = true;
                ConnectWebSocket();
                OnStreamingStarted?.Invoke();
                Debug.Log("Streaming started");
                return true;
            }
            else
            {
                Debug.LogError($"Failed to start streaming: {request.error}");
                return false;
            }
        }
    }
    
    public async Task<bool> StopStreamingAsync()
    {
        string url = $"{apiUrl}/stream/stop";
        
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            
            var operation = request.SendWebRequest();
            
            while (!operation.isDone)
            {
                await Task.Yield();
            }
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                isStreaming = false;
                DisconnectWebSocket();
                OnStreamingStopped?.Invoke();
                Debug.Log("Streaming stopped");
                return true;
            }
            else
            {
                Debug.LogError($"Failed to stop streaming: {request.error}");
                return false;
            }
        }
    }
    
    private async Task InitializeStreamAsync()
    {
        string url = $"{apiUrl}/stream/init";
        
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            await request.SendWebRequest();
        }
    }
    
    // WebSocket Management
    private void ConnectWebSocket()
    {
        if (webSocket != null && webSocket.IsAlive)
        {
            return;
        }
        
        webSocket = new WebSocketSharp.WebSocket(websocketUrl);
        
        webSocket.OnOpen += (sender, e) =>
        {
            Debug.Log("WebSocket connected");
        };
        
        webSocket.OnMessage += (sender, e) =>
        {
            try
            {
                var streamData = JsonConvert.DeserializeObject<StreamData>(e.Data);
                
                lock (queueLock)
                {
                    dataQueue.Enqueue(streamData);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to parse WebSocket message: {ex.Message}");
            }
        };
        
        webSocket.OnError += (sender, e) =>
        {
            Debug.LogError($"WebSocket error: {e.Message}");
        };
        
        webSocket.OnClose += (sender, e) =>
        {
            Debug.Log("WebSocket disconnected");
        };
        
        webSocket.Connect();
    }
    
    private void DisconnectWebSocket()
    {
        if (webSocket != null && webSocket.IsAlive)
        {
            webSocket.Close();
        }
    }
    
    // Data Processing
    private IEnumerator ProcessDataQueue()
    {
        while (true)
        {
            StreamData data = null;
            
            lock (queueLock)
            {
                if (dataQueue.Count > 0)
                {
                    data = dataQueue.Dequeue();
                }
            }
            
            if (data != null)
            {
                OnDataReceived?.Invoke(data);
            }
            
            yield return new WaitForSeconds(0.01f); // 100Hz processing
        }
    }
}

[System.Serializable]
public class StreamDataEvent : UnityEngine.Events.UnityEvent<StreamData> { }
```

## Data Visualization

### Real-time Data Visualizer

```csharp
// Scripts/DataVisualizer.cs
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class DataVisualizer : MonoBehaviour
{
    [Header("UI Components")]
    public LineRenderer eegLineRenderer;
    public LineRenderer ppgLineRenderer;
    public Text heartRateText;
    public Text batteryText;
    public Text activityText;
    public Slider[] frequencyBandSliders; // Delta, Theta, Alpha, Beta
    
    [Header("Visualization Settings")]
    public int maxDataPoints = 200;
    public float timeWindow = 10f; // seconds
    public Color eegColor = Color.blue;
    public Color ppgColor = Color.red;
    
    // Data storage
    private Queue<Vector3> eegPoints = new Queue<Vector3>();
    private Queue<Vector3> ppgPoints = new Queue<Vector3>();
    private float startTime;
    
    private void Start()
    {
        startTime = Time.time;
        
        // Setup line renderers
        SetupLineRenderer(eegLineRenderer, eegColor);
        SetupLineRenderer(ppgLineRenderer, ppgColor);
        
        // Subscribe to data events
        if (LinkBandManager.Instance != null)
        {
            LinkBandManager.Instance.OnDataReceived.AddListener(OnDataReceived);
        }
    }
    
    private void SetupLineRenderer(LineRenderer lr, Color color)
    {
        lr.material = new Material(Shader.Find("Sprites/Default"));
        lr.color = color;
        lr.startWidth = 0.05f;
        lr.endWidth = 0.05f;
        lr.useWorldSpace = false;
    }
    
    private void OnDataReceived(StreamData data)
    {
        float currentTime = Time.time - startTime;
        
        // Process EEG data
        if (data.eeg != null && data.eeg.Length > 0)
        {
            float eegValue = data.eeg[0]; // Use first channel
            AddDataPoint(eegPoints, new Vector3(currentTime, eegValue, 0), eegLineRenderer);
            
            // Update frequency bands if available
            UpdateFrequencyBands(data);
        }
        
        // Process PPG data
        if (data.ppg != null && data.ppg.Length > 0)
        {
            float ppgValue = data.ppg[0];
            AddDataPoint(ppgPoints, new Vector3(currentTime, ppgValue, 0), ppgLineRenderer);
            
            // Calculate and display heart rate
            UpdateHeartRate(data.ppg);
        }
        
        // Update other UI elements
        if (data.battery > 0)
        {
            batteryText.text = $"Battery: {data.battery:F0}%";
        }
        
        if (data.acc != null)
        {
            float magnitude = Mathf.Sqrt(data.acc.x * data.acc.x + 
                                       data.acc.y * data.acc.y + 
                                       data.acc.z * data.acc.z);
            string activity = ClassifyActivity(magnitude);
            activityText.text = $"Activity: {activity}";
        }
    }
    
    private void AddDataPoint(Queue<Vector3> points, Vector3 newPoint, LineRenderer lr)
    {
        points.Enqueue(newPoint);
        
        // Remove old points
        while (points.Count > maxDataPoints)
        {
            points.Dequeue();
        }
        
        // Update line renderer
        UpdateLineRenderer(points, lr);
    }
    
    private void UpdateLineRenderer(Queue<Vector3> points, LineRenderer lr)
    {
        Vector3[] pointArray = points.ToArray();
        lr.positionCount = pointArray.Length;
        
        // Normalize positions for display
        for (int i = 0; i < pointArray.Length; i++)
        {
            float normalizedX = (pointArray[i].x % timeWindow) / timeWindow * 10f - 5f;
            float normalizedY = Mathf.Clamp(pointArray[i].y * 0.001f, -2f, 2f);
            pointArray[i] = new Vector3(normalizedX, normalizedY, 0);
        }
        
        lr.SetPositions(pointArray);
    }
    
    private void UpdateFrequencyBands(StreamData data)
    {
        // This would require frequency analysis
        // For now, we'll simulate band values
        if (frequencyBandSliders.Length >= 4)
        {
            frequencyBandSliders[0].value = Random.Range(0.1f, 0.3f); // Delta
            frequencyBandSliders[1].value = Random.Range(0.1f, 0.4f); // Theta
            frequencyBandSliders[2].value = Random.Range(0.2f, 0.6f); // Alpha
            frequencyBandSliders[3].value = Random.Range(0.1f, 0.5f); // Beta
        }
    }
    
    private void UpdateHeartRate(float[] ppgData)
    {
        // Simplified heart rate calculation
        // In practice, you'd use peak detection algorithms
        float heartRate = 60f + Random.Range(-10f, 20f);
        heartRateText.text = $"HR: {heartRate:F0} BPM";
    }
    
    private string ClassifyActivity(float magnitude)
    {
        if (magnitude < 1.1f) return "Rest";
        if (magnitude < 1.5f) return "Light";
        if (magnitude < 2.0f) return "Moderate";
        return "Vigorous";
    }
}
```

## Game Integration

### EEG-Controlled Game Mechanics

```csharp
// Scripts/EEGGameController.cs
using UnityEngine;

public class EEGGameController : MonoBehaviour
{
    [Header("Game Settings")]
    public float focusThreshold = 0.6f;
    public float relaxationThreshold = 0.4f;
    public float attentionMultiplier = 2f;
    
    [Header("Game Objects")]
    public GameObject player;
    public ParticleSystem focusEffect;
    public Light ambientLight;
    
    [Header("Audio")]
    public AudioSource focusAudio;
    public AudioSource relaxationAudio;
    
    // Current mental state
    private float currentFocus = 0f;
    private float currentRelaxation = 0f;
    private float currentAttention = 0f;
    
    // Game state
    private bool isFocused = false;
    private bool isRelaxed = false;
    
    private void Start()
    {
        // Subscribe to Link Band data
        if (LinkBandManager.Instance != null)
        {
            LinkBandManager.Instance.OnDataReceived.AddListener(ProcessEEGData);
        }
    }
    
    private void ProcessEEGData(StreamData data)
    {
        if (data.eeg == null || data.eeg.Length == 0) return;
        
        // Calculate mental states from EEG data
        // This is a simplified example - real implementation would use proper signal processing
        CalculateMentalStates(data.eeg);
        
        // Apply game mechanics based on mental states
        ApplyGameMechanics();
    }
    
    private void CalculateMentalStates(float[] eegData)
    {
        // Simplified calculation - in practice, you'd use frequency band analysis
        float alpha = CalculateAlphaPower(eegData);
        float beta = CalculateBetaPower(eegData);
        float theta = CalculateThetaPower(eegData);
        
        // Focus = high beta, moderate alpha
        currentFocus = Mathf.Clamp01((beta * 0.7f + alpha * 0.3f) / 100f);
        
        // Relaxation = high alpha, low beta
        currentRelaxation = Mathf.Clamp01((alpha * 0.8f - beta * 0.2f) / 100f);
        
        // Attention = beta/alpha ratio
        currentAttention = Mathf.Clamp01(beta / (alpha + 1f));
    }
    
    private void ApplyGameMechanics()
    {
        // Focus-based mechanics
        if (currentFocus > focusThreshold && !isFocused)
        {
            EnterFocusState();
        }
        else if (currentFocus <= focusThreshold && isFocused)
        {
            ExitFocusState();
        }
        
        // Relaxation-based mechanics
        if (currentRelaxation > relaxationThreshold && !isRelaxed)
        {
            EnterRelaxationState();
        }
        else if (currentRelaxation <= relaxationThreshold && isRelaxed)
        {
            ExitRelaxationState();
        }
        
        // Continuous effects based on attention
        ApplyAttentionEffects();
    }
    
    private void EnterFocusState()
    {
        isFocused = true;
        Debug.Log("Entered focus state");
        
        // Visual effects
        if (focusEffect != null)
        {
            focusEffect.Play();
        }
        
        // Audio feedback
        if (focusAudio != null)
        {
            focusAudio.Play();
        }
        
        // Game mechanics (e.g., increased player speed, special abilities)
        if (player != null)
        {
            var playerController = player.GetComponent<PlayerController>();
            if (playerController != null)
            {
                playerController.SetFocusMode(true);
            }
        }
    }
    
    private void ExitFocusState()
    {
        isFocused = false;
        Debug.Log("Exited focus state");
        
        if (focusEffect != null)
        {
            focusEffect.Stop();
        }
        
        if (player != null)
        {
            var playerController = player.GetComponent<PlayerController>();
            if (playerController != null)
            {
                playerController.SetFocusMode(false);
            }
        }
    }
    
    private void EnterRelaxationState()
    {
        isRelaxed = true;
        Debug.Log("Entered relaxation state");
        
        // Calming visual effects
        if (ambientLight != null)
        {
            ambientLight.color = Color.Lerp(ambientLight.color, Color.blue, Time.deltaTime);
        }
        
        if (relaxationAudio != null)
        {
            relaxationAudio.Play();
        }
    }
    
    private void ExitRelaxationState()
    {
        isRelaxed = false;
        Debug.Log("Exited relaxation state");
        
        if (ambientLight != null)
        {
            ambientLight.color = Color.white;
        }
    }
    
    private void ApplyAttentionEffects()
    {
        // Scale game difficulty or mechanics based on attention level
        float attentionBonus = currentAttention * attentionMultiplier;
        
        // Example: Adjust game speed based on attention
        Time.timeScale = Mathf.Lerp(0.8f, 1.2f, currentAttention);
    }
    
    // Simplified frequency band calculations
    private float CalculateAlphaPower(float[] eegData)
    {
        // Placeholder - real implementation would use FFT
        return Mathf.Abs(eegData[0]) * Random.Range(8f, 13f);
    }
    
    private float CalculateBetaPower(float[] eegData)
    {
        return Mathf.Abs(eegData[0]) * Random.Range(13f, 30f);
    }
    
    private float CalculateThetaPower(float[] eegData)
    {
        return Mathf.Abs(eegData[0]) * Random.Range(4f, 8f);
    }
    
    // Public methods for UI display
    public float GetFocusLevel() => currentFocus;
    public float GetRelaxationLevel() => currentRelaxation;
    public float GetAttentionLevel() => currentAttention;
}
```

## VR/AR Integration

### VR EEG Visualization

```csharp
// Scripts/VREEGVisualizer.cs
using UnityEngine;
using UnityEngine.XR;

public class VREEGVisualizer : MonoBehaviour
{
    [Header("VR Settings")]
    public Transform leftHand;
    public Transform rightHand;
    public Transform headset;
    
    [Header("Visualization")]
    public GameObject brainModel;
    public ParticleSystem[] brainRegionEffects;
    public Material[] frequencyBandMaterials;
    
    [Header("Interaction")]
    public float gestureThreshold = 0.3f;
    public LayerMask interactionLayer;
    
    // EEG visualization
    private Renderer brainRenderer;
    private float[] currentBandPowers = new float[4]; // Delta, Theta, Alpha, Beta
    
    // VR interaction
    private bool isGesturing = false;
    private Vector3 lastHandPosition;
    
    private void Start()
    {
        if (brainModel != null)
        {
            brainRenderer = brainModel.GetComponent<Renderer>();
        }
        
        // Subscribe to EEG data
        if (LinkBandManager.Instance != null)
        {
            LinkBandManager.Instance.OnDataReceived.AddListener(OnEEGDataReceived);
        }
        
        // Initialize VR
        InitializeVR();
    }
    
    private void InitializeVR()
    {
        // Enable VR if available
        if (XRSettings.enabled)
        {
            Debug.Log("VR Mode enabled");
        }
    }
    
    private void Update()
    {
        UpdateVRInteraction();
        UpdateBrainVisualization();
    }
    
    private void OnEEGDataReceived(StreamData data)
    {
        if (data.eeg == null || data.eeg.Length == 0) return;
        
        // Update frequency band powers
        UpdateFrequencyBands(data.eeg);
        
        // Update particle effects based on brain activity
        UpdateBrainRegionEffects();
    }
    
    private void UpdateFrequencyBands(float[] eegData)
    {
        // Simplified frequency band calculation
        currentBandPowers[0] = CalculateBandPower(eegData, 1, 4);   // Delta
        currentBandPowers[1] = CalculateBandPower(eegData, 4, 8);   // Theta
        currentBandPowers[2] = CalculateBandPower(eegData, 8, 13);  // Alpha
        currentBandPowers[3] = CalculateBandPower(eegData, 13, 30); // Beta
    }
    
    private float CalculateBandPower(float[] data, float lowFreq, float highFreq)
    {
        // Placeholder calculation
        return Mathf.Abs(data[0]) * Random.Range(lowFreq, highFreq) * 0.1f;
    }
    
    private void UpdateBrainVisualization()
    {
        if (brainRenderer == null) return;
        
        // Change brain color based on dominant frequency band
        int dominantBand = GetDominantFrequencyBand();
        
        if (dominantBand >= 0 && dominantBand < frequencyBandMaterials.Length)
        {
            brainRenderer.material = frequencyBandMaterials[dominantBand];
        }
        
        // Scale brain model based on overall activity
        float totalActivity = 0f;
        foreach (float power in currentBandPowers)
        {
            totalActivity += power;
        }
        
        float scale = 1f + (totalActivity * 0.1f);
        brainModel.transform.localScale = Vector3.one * scale;
    }
    
    private void UpdateBrainRegionEffects()
    {
        for (int i = 0; i < brainRegionEffects.Length && i < currentBandPowers.Length; i++)
        {
            if (brainRegionEffects[i] != null)
            {
                var emission = brainRegionEffects[i].emission;
                emission.rateOverTime = currentBandPowers[i] * 10f;
            }
        }
    }
    
    private int GetDominantFrequencyBand()
    {
        int dominantBand = 0;
        float maxPower = currentBandPowers[0];
        
        for (int i = 1; i < currentBandPowers.Length; i++)
        {
            if (currentBandPowers[i] > maxPower)
            {
                maxPower = currentBandPowers[i];
                dominantBand = i;
            }
        }
        
        return dominantBand;
    }
    
    private void UpdateVRInteraction()
    {
        if (rightHand == null) return;
        
        // Detect hand gestures
        Vector3 currentHandPosition = rightHand.position;
        float handMovement = Vector3.Distance(currentHandPosition, lastHandPosition);
        
        if (handMovement > gestureThreshold)
        {
            if (!isGesturing)
            {
                OnGestureStart();
            }
            isGesturing = true;
        }
        else
        {
            if (isGesturing)
            {
                OnGestureEnd();
            }
            isGesturing = false;
        }
        
        lastHandPosition = currentHandPosition;
        
        // Raycast for interaction
        PerformVRRaycast();
    }
    
    private void PerformVRRaycast()
    {
        if (rightHand == null) return;
        
        Ray ray = new Ray(rightHand.position, rightHand.forward);
        RaycastHit hit;
        
        if (Physics.Raycast(ray, out hit, 10f, interactionLayer))
        {
            // Handle VR interaction with brain regions
            var brainRegion = hit.collider.GetComponent<BrainRegion>();
            if (brainRegion != null)
            {
                brainRegion.OnVRInteraction(currentBandPowers);
            }
        }
    }
    
    private void OnGestureStart()
    {
        Debug.Log("VR Gesture started");
        // Trigger special visualization or interaction
    }
    
    private void OnGestureEnd()
    {
        Debug.Log("VR Gesture ended");
    }
}

// Brain region component for VR interaction
public class BrainRegion : MonoBehaviour
{
    public string regionName;
    public int associatedFrequencyBand;
    
    private Renderer regionRenderer;
    private Color originalColor;
    
    private void Start()
    {
        regionRenderer = GetComponent<Renderer>();
        if (regionRenderer != null)
        {
            originalColor = regionRenderer.material.color;
        }
    }
    
    public void OnVRInteraction(float[] bandPowers)
    {
        if (regionRenderer == null) return;
        
        // Highlight region based on associated frequency band activity
        if (associatedFrequencyBand >= 0 && associatedFrequencyBand < bandPowers.Length)
        {
            float activity = bandPowers[associatedFrequencyBand];
            Color highlightColor = Color.Lerp(originalColor, Color.yellow, activity);
            regionRenderer.material.color = highlightColor;
            
            Debug.Log($"Interacting with {regionName}, Activity: {activity:F2}");
        }
    }
}
```

## Complete Example

### Main Application Controller

```csharp
// Scripts/LinkBandApp.cs
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using System.Threading.Tasks;

public class LinkBandApp : MonoBehaviour
{
    [Header("UI References")]
    public Button scanButton;
    public Button connectButton;
    public Button startStreamButton;
    public Button stopStreamButton;
    public Dropdown deviceDropdown;
    public Text statusText;
    public Toggle vrModeToggle;
    
    [Header("Scenes")]
    public GameObject normalModeUI;
    public GameObject vrModeUI;
    public GameObject dataVisualizationPanel;
    
    private LinkBandManager linkBandManager;
    private System.Collections.Generic.List<Device> availableDevices;
    
    private void Start()
    {
        linkBandManager = LinkBandManager.Instance;
        if (linkBandManager == null)
        {
            Debug.LogError("LinkBandManager not found!");
            return;
        }
        
        SetupUI();
        SetupEventListeners();
    }
    
    private void SetupUI()
    {
        // Setup button listeners
        scanButton.onClick.AddListener(() => StartCoroutine(ScanForDevices()));
        connectButton.onClick.AddListener(() => StartCoroutine(ConnectToDevice()));
        startStreamButton.onClick.AddListener(() => StartCoroutine(StartStreaming()));
        stopStreamButton.onClick.AddListener(() => StartCoroutine(StopStreaming()));
        vrModeToggle.onValueChanged.AddListener(OnVRModeToggle);
        
        // Initial UI state
        UpdateUI();
    }
    
    private void SetupEventListeners()
    {
        linkBandManager.OnDeviceConnected.AddListener(OnDeviceConnected);
        linkBandManager.OnDeviceDisconnected.AddListener(OnDeviceDisconnected);
        linkBandManager.OnStreamingStarted.AddListener(OnStreamingStarted);
        linkBandManager.OnStreamingStopped.AddListener(OnStreamingStopped);
    }
    
    private IEnumerator ScanForDevices()
    {
        statusText.text = "Scanning for devices...";
        scanButton.interactable = false;
        
        var task = linkBandManager.ScanDevicesAsync();
        yield return new WaitUntil(() => task.IsCompleted);
        
        availableDevices = task.Result;
        
        // Update dropdown
        deviceDropdown.ClearOptions();
        var options = new System.Collections.Generic.List<string>();
        
        foreach (var device in availableDevices)
        {
            options.Add($"{device.name} ({device.address})");
        }
        
        deviceDropdown.AddOptions(options);
        
        statusText.text = $"Found {availableDevices.Count} devices";
        scanButton.interactable = true;
        connectButton.interactable = availableDevices.Count > 0;
    }
    
    private IEnumerator ConnectToDevice()
    {
        if (availableDevices == null || deviceDropdown.value >= availableDevices.Count)
        {
            statusText.text = "No device selected";
            yield break;
        }
        
        var selectedDevice = availableDevices[deviceDropdown.value];
        statusText.text = $"Connecting to {selectedDevice.name}...";
        connectButton.interactable = false;
        
        var task = linkBandManager.ConnectDeviceAsync(selectedDevice.address);
        yield return new WaitUntil(() => task.IsCompleted);
        
        if (task.Result)
        {
            statusText.text = $"Connected to {selectedDevice.name}";
        }
        else
        {
            statusText.text = "Connection failed";
            connectButton.interactable = true;
        }
    }
    
    private IEnumerator StartStreaming()
    {
        statusText.text = "Starting data stream...";
        startStreamButton.interactable = false;
        
        var task = linkBandManager.StartStreamingAsync();
        yield return new WaitUntil(() => task.IsCompleted);
        
        if (task.Result)
        {
            statusText.text = "Streaming started";
            dataVisualizationPanel.SetActive(true);
        }
        else
        {
            statusText.text = "Failed to start streaming";
            startStreamButton.interactable = true;
        }
    }
    
    private IEnumerator StopStreaming()
    {
        statusText.text = "Stopping data stream...";
        stopStreamButton.interactable = false;
        
        var task = linkBandManager.StopStreamingAsync();
        yield return new WaitUntil(() => task.IsCompleted);
        
        if (task.Result)
        {
            statusText.text = "Streaming stopped";
            dataVisualizationPanel.SetActive(false);
        }
        else
        {
            statusText.text = "Failed to stop streaming";
        }
        
        stopStreamButton.interactable = true;
    }
    
    private void OnVRModeToggle(bool isVR)
    {
        normalModeUI.SetActive(!isVR);
        vrModeUI.SetActive(isVR);
        
        if (isVR)
        {
            // Enable VR components
            var vrVisualizer = FindObjectOfType<VREEGVisualizer>();
            if (vrVisualizer != null)
            {
                vrVisualizer.enabled = true;
            }
        }
    }
    
    // Event handlers
    private void OnDeviceConnected()
    {
        UpdateUI();
    }
    
    private void OnDeviceDisconnected()
    {
        UpdateUI();
    }
    
    private void OnStreamingStarted()
    {
        UpdateUI();
    }
    
    private void OnStreamingStopped()
    {
        UpdateUI();
    }
    
    private void UpdateUI()
    {
        connectButton.interactable = !linkBandManager.isConnected && availableDevices != null && availableDevices.Count > 0;
        startStreamButton.interactable = linkBandManager.isConnected && !linkBandManager.isStreaming;
        stopStreamButton.interactable = linkBandManager.isStreaming;
    }
}
```

This comprehensive Unity integration guide provides everything needed to build Link Band SDK applications in Unity, including device management, real-time data visualization, game integration, and VR/AR support. 