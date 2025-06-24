# Data Formats

Link Band SDK stores and processes various sensor data in standardized formats. This document describes the format and structure of each sensor data type.

## Supported Sensor Data

### EEG (Electroencephalography)
- **Number of Channels**: Up to 2 channels
- **Sampling Rate**: 250Hz (default)
- **Data Type**: 24-bit signed integer
- **Unit**: μV (microvolts)

### PPG (Photoplethysmography)
- **Number of Channels**: 1 channel
- **Sampling Rate**: 50Hz (default)
- **Data Type**: 16-bit unsigned integer
- **Unit**: ADC counts

### ACC (Accelerometer)
- **Axes**: X, Y, Z 3 axes
- **Sampling Rate**: 25Hz (default)
- **Data Type**: 16-bit signed integer
- **Unit**: mg (milliG)


### CSV Format

#### EEG Data
```csv
timestamp,CH1,CH2
1704110400.000,123.45,234.56
1704110400.004,124.67,235.78
1704110400.008,125.89,236.90
```

#### PPG Data
```csv
timestamp,PPG
1704110400.000,2048
1704110400.010,2056
1704110400.020,2064
```

#### ACC Data
```csv
timestamp,ACC_X,ACC_Y,ACC_Z
1704110400.000,0.123,0.456,0.789
1704110400.020,0.124,0.457,0.790
1704110400.040,0.125,0.458,0.791
```

### MAT Format (MATLAB)

.mat file format for use in MATLAB:

```matlab
% Load file
data = load('session_20240101_120000_eeg.mat');

% Access data
timestamps = data.timestamp;
eeg_ch1 = data.CH1;
eeg_ch2 = data.CH2;
sampling_rate = data.metadata.sampling_rate;
```

## Analytics Indices

Link Band SDK provides various analytics indices derived from sensor data to help interpret physiological and cognitive states. These indices are calculated in real-time and included in processed data files.

### EEG Analytics Indices

#### Focus Index
- **Description**: Focus Index indicates the level of cognitive concentration, calculated as the ratio of beta power to the sum of alpha and theta power. High values represent deep focus, while low values indicate distraction.
- **Formula**: Focus Index = Beta Power / (Alpha Power + Theta Power)
- **Normal Range**: 0.3 - 1.2 (normal focus), 1.2 - 2.0 (high focus)
- **Interpretation**: <0.3: Attention deficit or drowsiness; >2.0: Excessive tension or stress.
- **Reference**: Klimesch, W. (1999). EEG alpha and theta oscillations reflect cognitive and memory performance. Brain Research Reviews, 29(2-3), 169-195; Pope, A.T. et al. (1995). Biological Psychology, 40(1-2), 187-195.

#### Relaxation Index
- **Description**: Relaxation Index measures the mental relaxation state based on relative alpha activity. Higher values indicate more relaxed states.
- **Formula**: Relaxation Index = Alpha Power / (Alpha Power + Beta Power)
- **Normal Range**: 0.4 - 0.7 (normal relaxation), 0.7 - 0.9 (deep relaxation)
- **Interpretation**: <0.4: Tension or stress; >0.9: Excessive relaxation, reduced alertness.
- **Reference**: Bazanova, O. M., & Vernon, D. (2014). Neuroscience & Biobehavioral Reviews, 44, 94-110.

#### Stress Index
- **Description**: Stress Index represents mental stress and arousal, rising with increased high-frequency (beta, gamma) activity.
- **Formula**: Stress Index = (Beta Power + Gamma Power) / (Alpha Power + Theta Power)
- **Normal Range**: 0.5 - 1.5 (normal arousal)
- **Interpretation**: <0.5: Low arousal or drowsiness; >1.5: High stress or hyperarousal; >2.5: Severe stress.
- **Reference**: Ahn, J. W., et al. (2019). Sensors, 19(21), 4644.

#### Hemispheric Balance
- **Description**: Hemispheric Balance indicates the balance of alpha activity between left and right hemispheres, reflecting emotional and cognitive bias.
- **Formula**: (Left Alpha - Right Alpha) / (Left Alpha + Right Alpha)
- **Normal Range**: -0.2 ~ 0.2 (balanced)
- **Interpretation**: <-0.2: Right hemisphere dominance (creative, intuitive); >0.2: Left dominance (analytical, logical); >0.5 or <-0.5: Severe imbalance.
- **Reference**: Davidson, R. J. (2004). Biological Psychology, 67(1-2), 219-234.

#### Cognitive Load
- **Description**: Cognitive Load reflects mental workload and effort based on the theta/alpha ratio.
- **Formula**: Cognitive Load = Theta Power / Alpha Power
- **Normal Range**: 0.3 - 0.8 (optimal load)
- **Interpretation**: <0.3: Low engagement; >0.8: High cognitive load; >1.2: Overload.
- **Reference**: Gevins, A., & Smith, M. E. (2003). Theoretical Issues in Ergonomics Science, 4(1-2), 113-131.

#### Emotional Stability
- **Description**: Emotional Stability measures emotional regulation capacity based on the ratio of lower frequency to gamma power.
- **Formula**: Emotional Stability = (Alpha Power + Theta Power) / Gamma Power
- **Normal Range**: 2.0 - 8.0 (stable state)
- **Interpretation**: <2.0: Emotional instability or hyperarousal; >8.0: Excessive inhibition or blunted affect.
- **Reference**: Knyazev, G. G. (2007). Neuroscience & Biobehavioral Reviews, 31(3), 377-395.

#### Total Power
- **Description**: Total Power is the sum of all EEG band powers, indicating overall brain activity.
- **Formula**: Sum of delta, theta, alpha, beta, gamma band powers
- **Normal Range**: Varies by individual and context
- **Interpretation**: Higher values may indicate heightened neural activity; lower values may suggest low arousal or drowsiness.
- **Reference**: Standard EEG literature.

### PPG Analytics Indices

#### Heart Rate (BPM)
- **Description**: Heart rate in beats per minute, a fundamental metric of cardiovascular health.
- **Formula**: BPM = 60,000 / Mean RR Interval (ms)
- **Normal Range**: 60 - 100 bpm (adults at rest); 40 - 60 bpm (trained athletes)
- **Interpretation**: <60 bpm (bradycardia), >100 bpm (tachycardia), >120 bpm (severe tachycardia).
- **Reference**: American Heart Association Guidelines (2020).

#### SDNN (Standard Deviation of NN Intervals)
- **Description**: Standard deviation of NN intervals, reflecting overall heart rate variability.
- **Formula**: SDNN = √(Σ(RRᵢ - RR̄)² / (N-1))
- **Normal Range**: >50 ms (healthy); 20–50 ms (borderline)
- **Interpretation**: <20 ms: Autonomic dysfunction; >200 ms: Potential arrhythmia.
- **Reference**: Task Force, ESC (1996). Circulation, 93(5), 1043-1065.

#### RMSSD (Root Mean Square of Successive Differences)
- **Description**: Root mean square of successive RR differences, indicating parasympathetic activity.
- **Formula**: RMSSD = √(Σ(RRᵢ₊₁ - RRᵢ)² / (N-1))
- **Normal Range**: ~20 ms (healthy)
- **Interpretation**: <20 ms: Reduced parasympathetic activity; >100 ms: Excessive parasympathetic dominance.
- **Reference**: Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.

#### PNN50
- **Description**: Percentage of successive RR interval differences greater than 50 ms.
- **Formula**: PNN50 = (NN50 count / Total NN intervals) × 100%
- **Normal Range**: ~3%
- **Interpretation**: <3%: Reduced parasympathetic activity; >30%: High variability.
- **Reference**: Mietus, J. E., et al. (2002). Heart, 88(4), 378-380.

#### Low Frequency (LF)
- **Description**: Low frequency power (0.04–0.15 Hz), reflecting combined sympathetic and parasympathetic activity.
- **Normal Range**: 519–1052 ms²
- **Interpretation**: Low: reduced autonomic activity; High: stress or sympathetic overactivity.
- **Reference**: ESC Task Force (1996). Circulation, 93(5), 1043-1065.

#### High Frequency (HF)
- **Description**: High frequency power (0.15–0.4 Hz), indicating parasympathetic (vagal) activity.
- **Normal Range**: 657–2147 ms²
- **Interpretation**: Low: reduced vagal tone; High: excessive parasympathetic activity.
- **Reference**: Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.

#### LF/HF Ratio
- **Description**: Ratio of LF to HF power, indicating sympathovagal balance.
- **Formula**: LF/HF Ratio = LF Power / HF Power
- **Normal Range**: 0.5–2.0
- **Interpretation**: <0.5: Parasympathetic dominance; >2.0: Sympathetic dominance; >4.0: Severe imbalance.
- **Reference**: Billman, G. E. (2013). Frontiers in Physiology, 4, 26.

#### SDSD (Standard Deviation of Successive Differences)
- **Description**: Standard deviation of successive RR differences.
- **Interpretation**: Reflects rapid changes in heart rate variability.
- **Reference**: Standard HRV literature.

### ACC Analytics Indices

#### Activity State
- **Description**: Classified physical activity level based on accelerometer data.
- **Formula**: Movement Magnitude = √(∇x² + ∇y² + ∇z²); Average Movement = mean of magnitude.
- **Thresholds**: <200: Stationary; 200–600: Sitting; 600–1000: Walking; >1000: Running.
- **Interpretation**: Correlates with metabolic rate and caloric expenditure.
- **Reference**: Troiano, R. P., et al. (2008). Medicine & Science in Sports & Exercise, 40(1), 181-188.

#### Average Movement
- **Description**: Mean movement magnitude over the buffer period.
- **Interpretation**: Higher values indicate more dynamic movement.

#### Standard Deviation Movement
- **Description**: Variability of movement magnitude.
- **Interpretation**: High variability: irregular motion; Low variability: consistent activity.

#### Max Movement
- **Description**: Maximum movement magnitude detected.
- **Interpretation**: Indicates peak acceleration events.

## Data Export Options

### Supported Export Formats
- **JSON**: Native format with full metadata
- **CSV**: Simplified format for analysis tools
- **MAT**: MATLAB-compatible format
- **EDF**: European Data Format for clinical applications
- **BDF**: BioSemi Data Format

### Export Configuration
```json
{
  "export_settings": {
    "format": "CSV",
    "include_metadata": true,
    "include_quality_metrics": true,
    "include_analytics_indices": true,
    "time_format": "ISO8601",
    "decimal_precision": 6,
    "compression": "gzip"
  }
}
```

## Integration with Analysis Tools

### Python Integration
```python
import pandas as pd
import numpy as np

# Load CSV data
data = pd.read_csv('session_data.csv')

# Access analytics indices
focus_index = data['focus_index']
heart_rate = data['heart_rate']
activity_state = data['activity_state']
```

### MATLAB Integration
```matlab
% Load MAT file
load('session_data.mat');

% Access analytics indices
focus_index = data.focus_index;
heart_rate = data.heart_rate;
activity_state = data.activity_state;
```

### R Integration
```r
# Load CSV data
data <- read.csv('session_data.csv')

# Access analytics indices
focus_index <- data$focus_index
heart_rate <- data$heart_rate
activity_state <- data$activity_state
``` 