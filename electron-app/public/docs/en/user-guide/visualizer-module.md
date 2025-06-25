# Visualizer Module

The Visualizer module is a core component that visually displays real-time sensor data collected from Link Band. You can check EEG, PPG, and ACC data through real-time graphs.

## Key Features

### Real-time Data Visualization
- **EEG Signal**: Real-time monitoring of EEG signals
- **PPG Signal**: Display of photoplethysmography signals
- **ACC Data**: 3-axis accelerometer data visualization

### Graph Controls
- **Time Range Adjustment**: Set time range for data display
- **Channel Selection**: Selectively display specific sensor channels
- **Scale Adjustment**: Automatic/manual Y-axis scale adjustment

## How to Use

### 1. Activate Visualizer

Click the Visualizer tab on the main screen to activate the module.

```
1. Check Link Band connection
2. Start Engine
3. Click Visualizer tab
4. Check real-time data
```

### 2. Graph Settings

You can adjust display options for each sensor data:

- **Show/Hide**: Set whether to display each sensor data with checkboxes
- **Color Change**: Customize graph line colors
- **Range Adjustment**: Set time axis and amplitude axis ranges

### 3. Data Analysis

Through real-time displayed data, you can check the following:

- **Signal Quality**: Sensor contact status and signal strength
- **Artifacts**: Noise due to movement or external interference
- **Pattern Analysis**: Signal changes according to specific states or activities

## Graph Types

### EEG Graph
- **Channels**: Simultaneous display of multiple EEG channels
- **Filtering**: Real-time signal filtering application
- **Spectrum**: Frequency domain analysis (optional)

### PPG Graph
- **Raw Signal**: Unfiltered original PPG signal
- **Processed Signal**: Noise-removed PPG signal
- **Heart Rate**: Real-time heart rate calculation results

### ACC Graph
- **3-axis Data**: X, Y, Z axis acceleration data
- **Movement Detection**: Display of sudden movement events
- **Activity Classification**: Static/dynamic state distinction

## Performance Optimization

### Rendering Performance
- **Frame Rate**: Automatically adjusted to display performance
- **Data Compression**: Compressed data display for long time ranges
- **Memory Management**: Automatic cleanup of old data

### System Resources
- **CPU Usage**: CPU usage optimization according to graph complexity
- **Memory Usage**: Memory management according to displayed data amount
- **GPU Acceleration**: Hardware acceleration utilization (when supported)

## Troubleshooting

### When Graphs Don't Display
1. Check Link Band connection status
2. Check Engine startup status
3. Check data streaming status
4. Check browser compatibility

### Performance Issues
1. Reduce number of displayed channels
2. Shorten time range
3. Close other applications
4. Check hardware specifications

### Data Delay
1. Check USB connection status
2. Check system resources
3. Check network status (for wireless connections)
4. Update drivers

## Advanced Features

### Data Export
- **Screenshot**: Save current graph as image
- **Data Extraction**: Export data from displayed time range as CSV
- **Settings Save**: Save current visualization settings as profile

### Analysis Tools
- **Measurement Tools**: Direct measurement on graphs
- **Event Marking**: Add event marks at specific time points
- **Comparative Analysis**: Simultaneous comparison of multiple session data

You can monitor and analyze Link Band sensor data in real-time through the Visualizer module. 