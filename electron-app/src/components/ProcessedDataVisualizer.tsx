import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useSensorStore } from '../stores/sensor';
import { useDeviceStore } from '../stores/device';
import EEGPreprocessedGraph from './EEGPreprocessedGraph';
import EEGPSDGraph from './EEGPSDGraph';
import PPGGraph from './PPGGraph';
import ACCGraph from './ACCGraph';
import EEGBandPowerBarGraph from './EEGBandPowerBarGraph';
import EEGSQIGraph from './EEGSQIGraph';
import PPGSQIGraph from './PPGSQIGraph';
import { Eye, Brain, HeartPulse, Move3d, AlertCircle } from 'lucide-react';
import Tooltip from './ui/Tooltip';
import { indexGuides } from '../constants/indexGuides';

const SingleValueCard: React.FC<{ title: string; value: number | string }> = React.memo(({ title, value }) => (
  <Card className="bg-card h-full">
    <CardContent className="p-4 flex flex-col items-center justify-center h-full mt-2">
      <div className="text-sm font-bold text-muted-foreground mb-2 text-center">
        {title}
      </div>
      <div className="text-lg font-bold text-foreground">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </div>
    </CardContent>
  </Card>
));

// ToggleButton component for rendering toggle buttons
const ToggleButton: React.FC<{ selected: boolean; onClick: () => void; children: React.ReactNode }> = ({ selected, onClick, children }) => (
  <Button
    variant={selected ? "default" : "outline"}
    size="sm"
    onClick={onClick}
    className={`
      cursor-pointer rounded-full px-4 py-1 text-xs font-semibold transition-all duration-150
      ${selected 
        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
        : 'bg-muted hover:bg-muted/80 text-muted-foreground border-border'
      }
    `}
  >
    {children}
  </Button>
);

// const BandPowerCard: React.FC<{ title: string; powers: { delta: number; theta: number; alpha: number; beta: number; gamma: number } }> = ({ title, powers }) => (
//   <Card sx={{ p: 2, height: '100%' }}>
//     <Typography variant="subtitle2" color="text.secondary" gutterBottom>
//       {title}
//     </Typography>
//     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
//       {Object.entries(powers).map(([band, power]) => (
//         <Box key={band} sx={{ flex: '1 1 30%', minWidth: '100px' }}>
//           <Typography variant="caption" color="text.secondary">
//             {band.toUpperCase()}
//           </Typography>
//           <Typography variant="body2">
//             {power.toFixed(2)}
//           </Typography>
//         </Box>
//       ))}
//     </Box>
//   </Card>
// );

export const ProcessedDataVisualizer: React.FC = () => {
  const { eeg, ppg, acc } = useSensorStore();
  const deviceStatus = useDeviceStore((state) => state.deviceStatus);
  const isDeviceConnected = deviceStatus?.is_connected || false;
  
  const [visible, setVisible] = useState({
    raw: true,
    sqi: true,
    psd: true,
    band: true,
    index: true,
  });
  const [ppgVisible, setPPGVisible] = useState({
    raw: true,
    sqi: true,
    index: true,
  });
  const [accVisible, setACCVisible] = useState({
    raw: true,
    index: true,
  });
  
  // EEG 데이터 업데이트 상태 추적
  const [lastEEGUpdate, setLastEEGUpdate] = useState<number>(0);
  const [isEEGUpdating, setIsEEGUpdating] = useState(false);
  
  // PPG 데이터 업데이트 상태 추적
  const [lastPPGUpdate, setLastPPGUpdate] = useState<number>(0);
  const [isPPGUpdating, setIsPPGUpdating] = useState(false);
  
  // Sensor contact 상태 확인
  const isSensorContacted = eeg ? (!eeg.ch1_leadoff && !eeg.ch2_leadoff) : false;
  
  // EEG 데이터 업데이트 감지
  useEffect(() => {
    if (eeg && (eeg.ch1_filtered?.length > 0 || eeg.ch2_filtered?.length > 0)) {
      const now = Date.now();
      setLastEEGUpdate(now);
      setIsEEGUpdating(true);
    }
  }, [eeg?.ch1_filtered, eeg?.ch2_filtered]);
  
  // 5초 동안 업데이트가 없으면 업데이트 중지로 판단
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastEEGUpdate > 5000) {
        setIsEEGUpdating(false);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastEEGUpdate]);
  
  // PPG 데이터 업데이트 감지
  useEffect(() => {
    if (ppg && ppg.filtered_ppg && ppg.filtered_ppg.length > 0) {
      const now = Date.now();
      setLastPPGUpdate(now);
      setIsPPGUpdating(true);
    }
  }, [ppg?.filtered_ppg]);
  
  // 5초 동안 PPG 업데이트가 없으면 업데이트 중지로 판단
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastPPGUpdate > 5000) {
        setIsPPGUpdating(false);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastPPGUpdate]);

  // EEG 데이터 준비 - useMemo로 최적화
  const eegData = useMemo(() => ({
    frequencies: eeg?.frequencies || [],
    ch1Power: eeg?.ch1_power || [],
    ch2Power: eeg?.ch2_power || [],
    ch1BandPowers: eeg?.ch1_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
    ch2BandPowers: eeg?.ch2_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 }
  }), [eeg]);

  // 토글 핸들러들을 useCallback으로 최적화
  const handleToggle = useCallback((key: keyof typeof visible) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const allOn = useMemo(() => Object.values(visible).every(Boolean), [visible]);
  const handleAllToggle = useCallback(() => {
    const newState = !allOn;
    setVisible({ raw: newState, sqi: newState, psd: newState, band: newState, index: newState });
  }, [allOn]);

  const handlePPGToggle = useCallback((key: keyof typeof ppgVisible) => {
    setPPGVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const ppgAllOn = useMemo(() => Object.values(ppgVisible).every(Boolean), [ppgVisible]);
  const handlePPGAllToggle = useCallback(() => {
    const newState = !ppgAllOn;
    setPPGVisible({ raw: newState, sqi: newState, index: newState });
  }, [ppgAllOn]);

  const handleACCToggle = useCallback((key: keyof typeof accVisible) => {
    setACCVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const accAllOn = useMemo(() => Object.values(accVisible).every(Boolean), [accVisible]);
  const handleACCAllToggle = useCallback(() => {
    const newState = !accAllOn;
    setACCVisible({ raw: newState, index: newState });
  }, [accAllOn]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Eye className="w-8 h-8 text-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">
          Processed Data Visualizer
        </h1>
      </div>

      {/* EEG Section Toggle Buttons */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center text-lg font-semibold text-foreground">
          <Brain className="w-6 h-6 text-foreground mr-2" />
          EEG Graphs
        </h2>
        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={allOn} onClick={handleAllToggle}>
            All
          </ToggleButton>
          <ToggleButton selected={visible.raw} onClick={() => handleToggle('raw')}>
            Raw Data
          </ToggleButton>
          <ToggleButton selected={visible.sqi} onClick={() => handleToggle('sqi')}>
            SQI
          </ToggleButton>
          <ToggleButton selected={visible.psd} onClick={() => handleToggle('psd')}>
            PSD
          </ToggleButton>
          <ToggleButton selected={visible.band} onClick={() => handleToggle('band')}>
            Band Power
          </ToggleButton>
          <ToggleButton selected={visible.index} onClick={() => handleToggle('index')}>
            Index
          </ToggleButton>
        </div>
      </div>

      {/* EEG Status Messages */}
      {!isDeviceConnected && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">
            Please connect your device to start data collection
          </p>
        </div>
      )}
      
      {isDeviceConnected && !isSensorContacted && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-400">
            <p className="font-semibold mb-1">⚠️ Electrode Contact Warning</p>
            <p>
              {eeg?.ch1_leadoff && eeg?.ch2_leadoff 
                ? "Both channels are not in contact. Please adjust device placement." 
                : eeg?.ch1_leadoff 
                ? "Channel 1 is not in contact. Please adjust device placement."
                : "Channel 2 is not in contact. Please adjust device placement."
              }
            </p>
            <p className="mt-1 text-xs opacity-80">
              Data is still being processed and displayed, but accuracy may be reduced.
            </p>
          </div>
        </div>
      )}
      
      {isDeviceConnected && isSensorContacted && !isEEGUpdating && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400">
            Engine is currently processing data. High-quality EEG data for at least 10 seconds is required for proper analysis
          </p>
        </div>
      )}

      {/* 1행: Filtered EEG (Raw Data) */}
      {visible.raw && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EEGPreprocessedGraph channel="ch1" />
          <EEGPreprocessedGraph channel="ch2" />
        </div>
      )}

      {/* SQI 그래프 */}
      {visible.sqi && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EEGSQIGraph channel="ch1" />
          <EEGSQIGraph channel="ch2" />
        </div>
      )}

      {/* 2행: Power Spectrum */}
      {visible.psd && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EEGPSDGraph channel="ch1" frequencies={eegData.frequencies} power={eegData.ch1Power} color="#8884d8" />
          <EEGPSDGraph channel="ch2" frequencies={eegData.frequencies} power={eegData.ch2Power} color="#82ca9d" />
        </div>
      )}

      {/* 3행: Band Power BarGraph */}
      {visible.band && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EEGBandPowerBarGraph channel="ch1" bandPowers={eegData.ch1BandPowers} />
          <EEGBandPowerBarGraph channel="ch2" bandPowers={eegData.ch2BandPowers} />
        </div>
      )}

      {/* 4행: EEG 지표 카드 7개 */}
      {visible.index && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Tooltip content={indexGuides['Cognitive Load'] as string} title="Cognitive Load" position="left">
            <SingleValueCard title="Cognitive Load" value={eeg?.cognitive_load ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Emotional Stability'] as string} title="Emotional Stability">
            <SingleValueCard title="Emotional Stability" value={eeg?.emotional_stability ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Focus Index'] as string} title="Focus Index">
            <SingleValueCard title="Focus Index" value={eeg?.focus_index ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Hemispheric Balance'] as string} title="Hemispheric Balance">
            <SingleValueCard title="Hemispheric Balance" value={eeg?.hemispheric_balance ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Relaxation Index'] as string} title="Relaxation Index">
            <SingleValueCard title="Relaxation Index" value={eeg?.relaxation_index ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Stress Index'] as string} title="Stress Index">
            <SingleValueCard title="Stress Index" value={eeg?.stress_index ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['Total Power'] as string} title="Total Power" position="right">
            <SingleValueCard title="Total Power" value={eeg?.total_power ?? 'N/A'} />
          </Tooltip>
        </div>
      )}

      {/* PPG Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center text-lg font-semibold text-foreground">
          <HeartPulse className="w-6 h-6 text-foreground mr-2" />
          PPG Graphs
        </h2>
        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={ppgAllOn} onClick={handlePPGAllToggle}>
            All
          </ToggleButton>
          <ToggleButton selected={ppgVisible.raw} onClick={() => handlePPGToggle('raw')}>
            Raw Data
          </ToggleButton>
          <ToggleButton selected={ppgVisible.sqi} onClick={() => handlePPGToggle('sqi')}>
            SQI
          </ToggleButton>
          <ToggleButton selected={ppgVisible.index} onClick={() => handlePPGToggle('index')}>
            Index
          </ToggleButton>
        </div>
      </div>

      {/* PPG Status Messages */}
      {!isDeviceConnected && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">
            Please connect your device to start data collection
          </p>
        </div>
      )}
      
      {isDeviceConnected && !isSensorContacted && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-400">
            <p className="font-semibold mb-1">⚠️ Electrode Contact Warning</p>
            <p>Poor electrode contact may affect PPG data quality. Please ensure proper device placement.</p>
            <p className="mt-1 text-xs opacity-80">
              Data is still being processed and displayed, but accuracy may be reduced.
            </p>
          </div>
        </div>
      )}
      
      {isDeviceConnected && isSensorContacted && !isPPGUpdating && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400">
            Engine is currently processing data. High-quality PPG data for at least 60 seconds is required for proper analysis
          </p>
        </div>
      )}

      {/* PPG 그래프/카드 조건부 렌더링 */}
      {ppgVisible.raw && (
        <div className="mb-6">
          <PPGGraph />
        </div>
      )}
      {ppgVisible.sqi && (
        <div className="mb-6">
          <PPGSQIGraph />
        </div>
      )}
      {ppgVisible.index && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Tooltip content={indexGuides['BPM'] as string} title="Heart Rate (BPM)" position="left">
            <SingleValueCard title="BPM" value={ppg?.bpm ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['SDNN'] as string} title="SDNN">
            <SingleValueCard title="SDNN" value={ppg?.sdnn ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['RMSSD'] as string} title="RMSSD">
            <SingleValueCard title="RMSSD" value={ppg?.rmssd ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['LF'] as string} title="Low Frequency (LF)">
            <SingleValueCard title="LF" value={ppg?.lf ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['HF'] as string} title="High Frequency (HF)">
            <SingleValueCard title="HF" value={ppg?.hf ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['LF/HF'] as string} title="LF/HF Ratio">
            <SingleValueCard title="LF/HF" value={ppg?.lf_hf_ratio ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['PNN50'] as string} title="PNN50">
            <SingleValueCard title="PNN50" value={ppg?.pnn50 ?? 'N/A'} />
          </Tooltip>
          <Tooltip content={indexGuides['SDSD'] as string} title="SDSD" position="right">
            <SingleValueCard title="SDSD" value={ppg?.sdsd ?? 'N/A'} />
          </Tooltip>
        </div>
      )}

      {/* ACC Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center text-lg font-semibold text-foreground">
          <Move3d className="w-6 h-6 text-foreground mr-2" />
          ACC Graphs
        </h2>
        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={accAllOn} onClick={handleACCAllToggle}>
            All
          </ToggleButton>
          <ToggleButton selected={accVisible.raw} onClick={() => handleACCToggle('raw')}>
            Raw Data
          </ToggleButton>
          <ToggleButton selected={accVisible.index} onClick={() => handleACCToggle('index')}>
            Index
          </ToggleButton>
        </div>
      </div>

      {/* ACC 그래프/카드 조건부 렌더링 */}
      {accVisible.raw && (
        <div className="mb-6">
          <ACCGraph />
        </div>
      )}
      {accVisible.index && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Tooltip content={indexGuides['Activity State'] as string} title="Activity State" position="left">
            <SingleValueCard title="Activity State" value={acc?.activity_state || 'Unknown'} />
          </Tooltip>
          <Tooltip content={indexGuides['Average Movement'] as string} title="Average Movement">
            <SingleValueCard title="Average Movement" value={acc?.avg_movement || 0} />
          </Tooltip>
          <Tooltip content={indexGuides['Standard Deviation Movement'] as string} title="Standard Deviation Movement">
            <SingleValueCard title="Standard Deviation Movement" value={acc?.std_movement || 0} />
          </Tooltip>
          <Tooltip content={indexGuides['Max Movement'] as string} title="Max Movement" position="right">
            <SingleValueCard title="Max Movement" value={acc?.max_movement || 0} />
          </Tooltip>
        </div>
      )}
    </div>
  );
}; 