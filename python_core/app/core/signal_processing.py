from typing import List, Dict, Any, Optional
import numpy as np
from scipy import signal
import logging
import heartpy as hp
import mne
from mne.time_frequency import tfr_morlet
from collections import deque
import time
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Change to DEBUG level
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Set logger level to DEBUG

# Add console handler if not already present
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

# Buffer sizes for each data type
BUFFER_SIZES = {
    "eeg": 2000,   # 8 seconds of data (250Hz * 8s)
    "ppg": 3000,   # 60 seconds of data (50Hz * 60s)
    "acc": 150,    # 6 seconds of data (25Hz * 6s)
    "bat": 50      # 5 seconds of data (10Hz * 5s)
}

# Processing intervals in seconds
PROCESSING_INTERVALS = {
    "eeg": 0.5,    # Process every 0.5 second
    "ppg": 0.5,    # Process every 0.5 second
    "acc": 0.5,    # Process every 0.5 second
    "bat": 1.0     # Process every 1 second
}

def bandpass_filter(data: np.ndarray, low_freq: float, high_freq: float, fs: float = 250) -> np.ndarray:
    """Apply bandpass filter to the input data"""
    nyquist = fs / 2
    low = low_freq / nyquist
    high = high_freq / nyquist
    b, a = signal.butter(4, [low, high], btype='band')
    return signal.filtfilt(b, a, data)

def notch_filter(data: np.ndarray, notch_freq: float, fs: float = 250, quality_factor: float = 30.0) -> np.ndarray:
    """Apply notch filter to remove specific frequency"""
    try:
        ch_names = ['ch1']
        ch_types = ['eeg']
        info = mne.create_info(ch_names=ch_names, sfreq=fs, ch_types=ch_types)
        raw = mne.io.RawArray(data.reshape(1, -1), info)
        raw.notch_filter(freqs=[notch_freq], picks='all', method='fir', phase='zero')
        return raw.get_data()[0]
    except Exception as e:
        logger.error(f"Error applying notch filter: {e}")
        return data

class SignalProcessor:
    EEG_BANDS = {
        "delta": (1, 4),
        "theta": (4, 8),
        "alpha": (8, 13),
        "beta": (13, 30),
        "gamma": (30, 45)
    }

    def __init__(self):
        self.sampling_rate = 250  # Hz
        self.window_size = 1000   # 4 seconds
        self.overlap = 500        # 2 seconds
        
        # Initialize buffers
        self.buffers = {
            "eeg": deque(maxlen=BUFFER_SIZES["eeg"]),
            "ppg": deque(maxlen=BUFFER_SIZES["ppg"]),
            "acc": deque(maxlen=BUFFER_SIZES["acc"]),
            "bat": deque(maxlen=BUFFER_SIZES["bat"])
        }
        
        # Initialize previous values
        self.prev_ch1_sqi = None
        self.prev_ch2_sqi = None
        self.last_good_eeg_power = {
            'ch1_power': [],
            'ch2_power': [],
            'frequencies': [],
            'ch1_band_powers': {k: 0.0 for k in self.EEG_BANDS},
            'ch2_band_powers': {k: 0.0 for k in self.EEG_BANDS}
        }
        self.last_good_ppg_result = None
        self.last_good_indices = None
        
        # Initialize last processing times
        self.last_processing_times = {
            "eeg": 0.0,
            "ppg": 0.0,
            "acc": 0.0,
            "bat": 0.0
        }

    def should_process(self, data_type: str) -> bool:
        """Check if it's time to process the data based on the processing interval"""
        current_time = time.time()
        if current_time - self.last_processing_times[data_type] >= PROCESSING_INTERVALS[data_type]:
            self.last_processing_times[data_type] = current_time
            return True
        return False

    def calculate_amplitude_sqi(self, data: np.ndarray, threshold: float = 100) -> np.ndarray:
        """Calculate Signal Quality Index based on signal amplitude"""
        window_size = 10
        sqi_values = np.zeros_like(data)
        for i in range(0, len(data) - window_size + 1):
            window = data[i:i + window_size]
            good_samples = np.sum(np.abs(window) < threshold)
            window_sqi = good_samples / window_size
            sqi_values[i:i + window_size] = window_sqi
        return sqi_values

    def calculate_frequency_sqi(self, data: np.ndarray, fs: float = 250, 
                              low_freq: float = 1, high_freq: float = 45) -> np.ndarray:
        """Calculate Signal Quality Index based on frequency content"""
        window_size = 50
        sqi_values = np.zeros_like(data)
        for i in range(0, len(data) - window_size + 1):
            window = data[i:i + window_size]
            freqs, psd = signal.welch(window, fs, nperseg=min(32, window_size))
            mask = (freqs >= low_freq) & (freqs <= high_freq)
            band_power = np.sum(psd[mask])
            total_power = np.sum(psd)
            window_sqi = band_power / total_power if total_power > 0 else 0
            sqi_values[i:i + window_size] = window_sqi
        return sqi_values

    def calculate_combined_sqi(self, amplitude_sqi: np.ndarray, frequency_sqi: np.ndarray) -> np.ndarray:
        """Combine amplitude and frequency SQI"""
        return 1.0 * amplitude_sqi + 0.0 * frequency_sqi

    def calculate_ppg_sqi(self, data: np.ndarray, threshold: float = 50) -> np.ndarray:
        """Calculate amplitude-based SQI for PPG"""
        window_size = 25
        sqi_values = np.zeros_like(data)
        for i in range(0, len(data) - window_size + 1):
            window = data[i:i + window_size]
            good_samples = np.sum(np.abs(window) < threshold)
            window_sqi = good_samples / window_size
            sqi_values[i:i + window_size] = window_sqi
        return sqi_values

    @staticmethod
    def compute_band_powers(power_db, freqs, bands=None):
        """Compute band powers from power spectrum"""
        if bands is None:
            bands = SignalProcessor.EEG_BANDS
        band_powers = {}
        arr_power = np.array(power_db)
        arr_freqs = np.array(freqs)
        for band, (low, high) in bands.items():
            mask = (arr_freqs >= low) & (arr_freqs < high)
            band_powers[band] = float(np.mean(arr_power[mask])) if np.any(mask) else 0.0
        return band_powers

    def compute_lf_hf(self, rr_intervals_ms, fs=4.0):
        """Compute LF, HF, LF/HF from RR intervals"""
        if len(rr_intervals_ms) < 4:
            return 0.0, 0.0, 0.0
        rr_intervals_s = np.array(rr_intervals_ms) / 1000.0
        t = np.cumsum(rr_intervals_s)
        t_interp = np.arange(t[0], t[-1], 1/fs)
        rr_interp = np.interp(t_interp, t, rr_intervals_s)
        f, pxx = signal.welch(rr_interp, fs=fs, nperseg=min(256, len(rr_interp)))
        lf_band = (f >= 0.04) & (f < 0.15)
        hf_band = (f >= 0.15) & (f < 0.4)
        lf = np.trapz(pxx[lf_band], f[lf_band]) * 1e5
        hf = np.trapz(pxx[hf_band], f[hf_band]) * 1e5
        lf_hf = lf / hf if hf > 0 else 0
        return lf, hf, lf_hf

    def add_to_buffer(self, data_type: str, data: List[Dict[str, Any]]):
        """Add data to the appropriate buffer"""
        if data_type in self.buffers:
            if isinstance(data, list):
                self.buffers[data_type].extend(data)
            else:
                self.buffers[data_type].append(data)
            # logger.info(f"Added data to {data_type} buffer. Current size: {len(self.buffers[data_type])}")
    
    def get_buffer_data(self, data_type: str) -> List[Dict[str, Any]]:
        """Get all data from the specified buffer"""
        if data_type in self.buffers:
            data = list(self.buffers[data_type])
            # logger.debug(f"Retrieved {len(data)} samples from {data_type} buffer")
            return data
        return []
    
    def clear_buffer(self, data_type: str):
        """Clear the specified buffer"""
        if data_type in self.buffers:
            self.buffers[data_type].clear()
            logger.info(f"Cleared {data_type} buffer")

    async def process_eeg_data(self):
        """Process EEG data with bandpass filtering and power spectrum analysis"""
        try:
            # Check if it's time to process
            if not self.should_process("eeg"):
                return None
            
            logger.info("Processing EEG data at scheduled interval")
            
            # Get data from buffer
            buffer_data = self.get_buffer_data("eeg")
            
            # Check if we have enough data
            if len(buffer_data) < 2000:  # 최소 1초의 데이터
                logger.warning(f"Insufficient EEG data points: {len(buffer_data)} < 2000")
                return None
            
            logger.info(f"Processing {len(buffer_data)} EEG samples")
            
            # Extract data from buffer
            ch1_data = np.array([float(d.get('ch1', 0)) for d in buffer_data])
            ch2_data = np.array([float(d.get('ch2', 0)) for d in buffer_data])
            ch1_leadoff = np.array([bool(d.get('leadoff_ch1', False)) for d in buffer_data])
            ch2_leadoff = np.array([bool(d.get('leadoff_ch2', False)) for d in buffer_data])
            
            # Run CPU-intensive tasks in a thread pool
            loop = asyncio.get_event_loop()
            
            # Apply filters
            ch1_notched = await loop.run_in_executor(None, lambda: notch_filter(ch1_data, notch_freq=60, fs=self.sampling_rate))
            ch2_notched = await loop.run_in_executor(None, lambda: notch_filter(ch2_data, notch_freq=60, fs=self.sampling_rate))
            
            ch1_filtered = await loop.run_in_executor(None, lambda: bandpass_filter(ch1_notched, 1, 45, fs=self.sampling_rate))
            ch2_filtered = await loop.run_in_executor(None, lambda: bandpass_filter(ch2_notched, 1, 45, fs=self.sampling_rate))
            
            # Calculate SQI
            ch1_amplitude_sqi = await loop.run_in_executor(None, lambda: self.calculate_amplitude_sqi(ch1_filtered))
            ch2_amplitude_sqi = await loop.run_in_executor(None, lambda: self.calculate_amplitude_sqi(ch2_filtered))
            ch1_frequency_sqi = await loop.run_in_executor(None, lambda: self.calculate_frequency_sqi(ch1_filtered, fs=self.sampling_rate))
            ch2_frequency_sqi = await loop.run_in_executor(None, lambda: self.calculate_frequency_sqi(ch2_filtered, fs=self.sampling_rate))
            ch1_sqi = await loop.run_in_executor(None, lambda: self.calculate_combined_sqi(ch1_amplitude_sqi, ch1_frequency_sqi))
            ch2_sqi = await loop.run_in_executor(None, lambda: self.calculate_combined_sqi(ch2_amplitude_sqi, ch2_frequency_sqi))
            
            # Create quality masks
            ch1_quality_mask = ch1_sqi >= 0.7
            ch2_quality_mask = ch2_sqi >= 0.7
            good_quality_samples = np.sum(ch1_quality_mask & ch2_quality_mask)
            
            logger.info(f"EEG quality: {good_quality_samples}/{len(ch1_data)} good samples")
            
            # Perform wavelet analysis on high-quality data
            ch1_power = []
            ch2_power = []
            frequencies = []
            
            if good_quality_samples > 0:
                ch_names = ['ch1', 'ch2']
                ch_types = ['eeg', 'eeg']
                info = mne.create_info(ch_names=ch_names, sfreq=self.sampling_rate, ch_types=ch_types)
                
                ch1_quality_data = ch1_filtered[ch1_quality_mask]
                ch2_quality_data = ch2_filtered[ch2_quality_mask]
                min_length = min(len(ch1_quality_data), len(ch2_quality_data))
                ch1_quality_data = ch1_quality_data[:min_length]
                ch2_quality_data = ch2_quality_data[:min_length]
                
                raw_data = np.vstack([ch1_quality_data, ch2_quality_data])
                raw = mne.io.RawArray(raw_data, info)
                
                event_duration = int(self.sampling_rate)
                n_events = len(raw.times) // event_duration
                events = np.zeros((n_events, 3), dtype=int)
                events[:, 0] = np.arange(0, n_events * event_duration, event_duration)
                events[:, 2] = 1

                epochs = mne.Epochs(raw, events, tmin=0, tmax=1.0 - 1.0/self.sampling_rate, baseline=None, preload=True)
                freqs = np.arange(1, 46, 1)
                n_cycles = freqs / 2.
                
                # Run TFR analysis in thread pool
                tfr = await loop.run_in_executor(None, lambda: tfr_morlet(epochs, freqs=freqs, n_cycles=n_cycles, return_itc=False))
                
                if tfr.data.ndim == 4:
                    power = np.mean(tfr.data, axis=(0, 3))
                elif tfr.data.ndim == 3:
                    power = np.mean(tfr.data, axis=2)
                else:
                    logger.error(f"[ERROR] Unexpected TFR data shape: {tfr.data.shape}")
                    return None

                ch1_power_db = 10 * np.log10(power[0])
                ch2_power_db = 10 * np.log10(power[1])
                
                ch1_power = ch1_power_db.tolist()
                ch2_power = ch2_power_db.tolist()
                frequencies = freqs.tolist()
            
            # Downsample filtered data
            downsample_factor = len(ch1_filtered) // 250
            ch1_filtered_downsampled = ch1_filtered[::downsample_factor]
            ch2_filtered_downsampled = ch2_filtered[::downsample_factor]
            ch1_sqi_downsampled = ch1_sqi[::downsample_factor]
            ch2_sqi_downsampled = ch2_sqi[::downsample_factor]

            # Calculate band powers
            ch1_band_powers = await loop.run_in_executor(None, lambda: self.compute_band_powers(ch1_power, frequencies))
            ch2_band_powers = await loop.run_in_executor(None, lambda: self.compute_band_powers(ch2_power, frequencies))

            # Calculate EEG indices
            total_power = sum(ch1_band_powers.values())
            beta = ch1_band_powers['beta']
            alpha = ch1_band_powers['alpha']
            theta = ch1_band_powers['theta']
            gamma = ch1_band_powers['gamma']
            
            focus_index = beta / (alpha + theta) if (alpha + theta) > 0 else 0
            relaxation_index = alpha / (alpha + beta) if (alpha + beta) > 0 else 0
            stress_index = (beta + gamma) / (alpha + theta) if (alpha + theta) > 0 else 0
            
            left_power = ch1_band_powers['alpha']
            right_power = ch2_band_powers['alpha']
            hemispheric_balance = (left_power - right_power) / (left_power + right_power) if (left_power + right_power) > 0 else 0
            
            cognitive_load = theta / alpha if alpha > 0 else 0
            emotional_stability = (alpha + theta) / gamma if gamma > 0 else 0

            # Prepare result
            result = {
                'timestamp': time.time(),
                'ch1_filtered': ch1_filtered_downsampled.tolist(),
                'ch2_filtered': ch2_filtered_downsampled.tolist(),
                'ch1_leadoff': bool(np.any(ch1_leadoff)),
                'ch2_leadoff': bool(np.any(ch2_leadoff)),
                'ch1_sqi': ch1_sqi_downsampled.tolist(),
                'ch2_sqi': ch2_sqi_downsampled.tolist(),
                'ch1_power': ch1_power,
                'ch2_power': ch2_power,
                'frequencies': frequencies,
                'ch1_band_powers': ch1_band_powers,
                'ch2_band_powers': ch2_band_powers,
                'signal_quality': 'good' if good_quality_samples >= 1000 else 'poor',
                'good_samples_ratio': good_quality_samples/len(ch1_data),
                'total_power': float(total_power),
                'focus_index': float(focus_index),
                'relaxation_index': float(relaxation_index),
                'stress_index': float(stress_index),
                'hemispheric_balance': float(hemispheric_balance),
                'cognitive_load': float(cognitive_load),
                'emotional_stability': float(emotional_stability)
            }
            
            logger.info("EEG processing completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error processing EEG data: {e}", exc_info=True)
            return None

    async def process_ppg_data(self):
        """Process PPG data"""
        try:
            # Check if it's time to process
            if not self.should_process("ppg"):
                return None
            
            logger.info("Processing PPG data at scheduled interval")
            
            # Get data from buffer
            buffer_data = self.get_buffer_data("ppg")
            
            # Check if we have enough data
            if len(buffer_data) < 3000:  # 최소 60초의 데이터
                logger.warning(f"Insufficient PPG data points: {len(buffer_data)} < 3000")
                return None
            
            logger.info(f"Processing {len(buffer_data)} PPG samples")
            
            # Extract data from buffer
            red_data = np.array([float(d.get('red', 0)) for d in buffer_data])
            ir_data = np.array([float(d.get('ir', 0)) for d in buffer_data])
            
            if len(red_data) == 0 or len(red_data) == 0:
                logger.warning("[WARNING] Empty PPG data received")
                return None
            
            sampling_rate = 50  # PPG sampling rate (Hz)
            
            try:
                # Run CPU-intensive tasks in a thread pool
                loop = asyncio.get_event_loop()
                
                # Filter PPG signal
                filtered_ppg = await loop.run_in_executor(None, lambda: hp.filter_signal(
                    red_data,
                    cutoff=[0.5, 5.0],
                    sample_rate=sampling_rate,
                    order=2,
                    filtertype='bandpass'
                ))
                
                # Calculate SQI
                ppg_sqi = await loop.run_in_executor(None, lambda: self.calculate_ppg_sqi(filtered_ppg))
                good_mask = ppg_sqi >= 0.95
                good_quality_samples = np.sum(good_mask)
                good_sample_ratio = good_quality_samples / len(filtered_ppg)
                
                # Downsample recent data
                filtered_ppg_recent = filtered_ppg[-1000:] if len(filtered_ppg) >= 1000 else filtered_ppg
                ppg_sqi_recent = ppg_sqi[-1000:] if len(ppg_sqi) >= 1000 else ppg_sqi
                downsample_factor = len(filtered_ppg_recent) // 250 if len(filtered_ppg_recent) >= 250 else 1
                filtered_ppg_downsampled = filtered_ppg_recent[::downsample_factor]
                ppg_sqi_downsampled = ppg_sqi_recent[::downsample_factor]

                # Initialize result
                result = {
                    'timestamp': time.time(),
                    'filtered_ppg': filtered_ppg_downsampled.tolist(),
                    'ppg_sqi': ppg_sqi_downsampled.tolist(),
                    'bpm': None,
                    'sdnn': None,
                    'rmssd': None,
                    'signal_quality': 'poor',
                    'red_mean': float(np.mean(red_data)),
                    'ir_mean': float(np.mean(ir_data)),
                    'rr_intervals': [],
                    'pnn50': None,
                    'sdsd': None,
                    'hr_mad': None,
                    'sd1': None,
                    'sd2': None,
                    'lf': None,
                    'hf': None,
                    'lf_hf': None
                }
                
                if good_sample_ratio >= 0.5:
                    try:
                        filtered_ppg_good = filtered_ppg[good_mask]
                        wd, m = await loop.run_in_executor(None, lambda: hp.process(filtered_ppg_good, sample_rate=sampling_rate))
                        
                        # Extract metrics
                        bpm = float(m['bpm'])
                        sdnn = float(m['sdnn'])
                        rmssd = float(m['rmssd'])
                        pnn50 = float(m.get('pnn50', 0)) * 100
                        sdsd = float(m.get('sdsd', 0))
                        hr_mad = float(m.get('hr_mad', 0))
                        rr_intervals = wd['RR_list'].tolist() if 'RR_list' in wd else []
                        sd1 = float(m.get('sd1', 0))
                        sd2 = float(m.get('sd2', 0))
                        
                        # Calculate LF/HF
                        rr_cleaned = [r for r in rr_intervals if 300 <= r <= 1200]
                        if len(rr_cleaned) >= 30:
                            lf, hf, lf_hf = await loop.run_in_executor(None, lambda: self.compute_lf_hf(rr_cleaned))
                        else:
                            lf, hf, lf_hf = 0.0, 0.0, 0.0
                        
                        # Update result
                        result.update({
                            'bpm': bpm,
                            'sdnn': sdnn,
                            'rmssd': rmssd,
                            'signal_quality': 'good',
                            'rr_intervals': rr_intervals,
                            'pnn50': pnn50,
                            'sdsd': sdsd,
                            'hr_mad': hr_mad,
                            'sd1': sd1,
                            'sd2': sd2,
                            'lf': lf,
                            'hf': hf,
                            'lf_hf': lf_hf
                        })
                        
                        self.last_good_ppg_result = result.copy()
                        
                    except Exception as e:
                        logger.error(f"[ERROR] HeartPy processing failed: {str(e)}")
                        if self.last_good_ppg_result:
                            for k in result:
                                if k not in ['filtered_ppg', 'ppg_sqi']:
                                    result[k] = self.last_good_ppg_result.get(k, result[k])
                else:
                    if self.last_good_ppg_result:
                        for k in result:
                            if k not in ['filtered_ppg', 'ppg_sqi']:
                                result[k] = self.last_good_ppg_result.get(k, result[k])
                
                logger.info("PPG processing completed successfully")
                return result
                
            except Exception as e:
                logger.error(f"[ERROR] HeartPy processing failed: {str(e)}")
                return None
            
        except Exception as e:
            logger.error(f"Error processing PPG data: {e}", exc_info=True)
            return None

    async def process_acc_data(self) -> Optional[Dict[str, Any]]:
        """Process accelerometer data from the buffer."""
        if len(self.buffers["acc"]) < 150:
            logger.warning(f"Insufficient ACC data points: {len(self.buffers['acc'])} < 150")
            return None

        try:
            # Get data from buffer
            buffer_data = self.get_buffer_data("acc")
            
            # Check if we have enough data
            if len(buffer_data) < 30:  # 최소 1초의 데이터
                logger.warning(f"Insufficient ACC data points: {len(buffer_data)} < 30")
                return None
            
            logger.info(f"Processing {len(buffer_data)} ACC samples")
            
            # Extract data from buffer
            x_data = np.array([float(d.get('x', 0)) for d in buffer_data])
            y_data = np.array([float(d.get('y', 0)) for d in buffer_data])
            z_data = np.array([float(d.get('z', 0)) for d in buffer_data])
            
            if len(x_data) < 2:
                logger.warning(f"Insufficient ACC data points: {len(x_data)} < 2")
                return None
            
            # Run CPU-intensive tasks in a thread pool
            loop = asyncio.get_event_loop()
            
            # Calculate movement
            x_change = await loop.run_in_executor(None, lambda: np.gradient(x_data))
            y_change = await loop.run_in_executor(None, lambda: np.gradient(y_data))
            z_change = await loop.run_in_executor(None, lambda: np.gradient(z_data))
            movement_magnitude = await loop.run_in_executor(None, lambda: np.sqrt(x_change**2 + y_change**2 + z_change**2))
            
            # Calculate statistics
            avg_movement = float(np.mean(movement_magnitude))
            std_movement = float(np.std(movement_magnitude))
            max_movement = float(np.max(movement_magnitude))
            
            # Determine activity state
            if avg_movement < 200:
                activity_state = "stationary"
            elif avg_movement < 600:
                activity_state = "sitting"
            elif avg_movement < 1000:
                activity_state = "walking"
            else:
                activity_state = "running"
            
            # Prepare result
            result = {
                'timestamp': time.time(),
                'x_change': x_change.tolist(),
                'y_change': y_change.tolist(),
                'z_change': z_change.tolist(),
                'avg_movement': avg_movement,
                'std_movement': std_movement,
                'max_movement': max_movement,
                'activity_state': activity_state,
                'x_change_mean': float(np.mean(x_change)),
                'y_change_mean': float(np.mean(y_change)),
                'z_change_mean': float(np.mean(z_change))
            }
            
            logger.info("ACC processing completed successfully")
            return result

        except Exception as e:
            logger.error(f"Error processing ACC data: {e}")
            return None

    async def process_bat_data(self, data: List[Dict[str, Any]]):
        """Process battery data"""
        try:
            # Add new data to buffer
            for data_point in data:
                self.add_to_buffer("bat", data_point)
            
            # Check if it's time to process
            if not self.should_process("bat"):
                return None
            
            logger.info("Processing battery data at scheduled interval")
            
            # Get data from buffer
            buffer_data = self.get_buffer_data("bat")
            
            # Check if we have enough data
            if len(buffer_data) < BUFFER_SIZES["bat"]:
                logger.warning(f"[WARNING] Insufficient battery data points: {len(buffer_data)} < {BUFFER_SIZES['bat']}")
                return None
            
            # Extract data from buffer
            level_data = np.array([d['level'] for d in buffer_data])
            
            # Calculate average level
            avg_level = float(np.mean(level_data))
            
            # Determine battery status
            if avg_level >= 80:
                status = "high"
            elif avg_level >= 20:
                status = "medium"
            else:
                status = "low"
            
            # Prepare result
            result = {
                'timestamp': time.time(),
                'battery_level': avg_level,
                'battery_status': status
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing battery data: {e}", exc_info=True)
            return None 