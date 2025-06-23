import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useSensorStore } from '../stores/sensor';
import EEGPreprocessedGraph from './EEGPreprocessedGraph';
import EEGPSDGraph from './EEGPSDGraph';
import PPGGraph from './PPGGraph';
import ACCGraph from './ACCGraph';
import EEGBandPowerBarGraph from './EEGBandPowerBarGraph';
import EEGSQIGraph from './EEGSQIGraph';
import PPGSQIGraph from './PPGSQIGraph';
import { Eye } from 'lucide-react';

const SingleValueCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <Card className="bg-card h-full">
    <CardContent className="p-4">
      <div className="text-xs font-semibold text-muted-foreground mb-1">
        {title}
      </div>
      <div className="text-sm font-semibold text-foreground">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </div>
    </CardContent>
  </Card>
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

  // EEG 데이터 준비
//   const ch1Filtered = eeg?.ch1_filtered || [];
//   const ch2Filtered = eeg?.ch2_filtered || [];
  const frequencies = eeg?.frequencies || [];
  const ch1Power = eeg?.ch1_power || [];
  const ch2Power = eeg?.ch2_power || [];
  const ch1BandPowers = eeg?.ch1_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  const ch2BandPowers = eeg?.ch2_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };

  const handleToggle = (key: keyof typeof visible) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allOn = Object.values(visible).every(Boolean);
  const handleAllToggle = () => {
    const newState = !allOn;
    setVisible({ raw: newState, sqi: newState, psd: newState, band: newState, index: newState });
  };

  const ppgAllOn = Object.values(ppgVisible).every(Boolean);
  const handlePPGAllToggle = () => {
    const newState = !ppgAllOn;
    setPPGVisible({ raw: newState, sqi: newState, index: newState });
  };

  const accAllOn = Object.values(accVisible).every(Boolean);
  const handleACCAllToggle = () => {
    const newState = !accAllOn;
    setACCVisible({ raw: newState, index: newState });
  };

  const ToggleButton: React.FC<{ 
    selected: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
  }> = ({ selected, onClick, children }) => (
    <Button
      variant={selected ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`
        rounded-full px-4 py-1 text-xs font-semibold transition-all
        ${selected 
          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
          : 'bg-muted hover:bg-muted/80 text-muted-foreground border-border'
        }
      `}
    >
      {children}
    </Button>
  );

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
        <h2 className="text-lg font-semibold text-foreground">
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
          <EEGPSDGraph channel="ch1" frequencies={frequencies} power={ch1Power} color="#8884d8" />
          <EEGPSDGraph channel="ch2" frequencies={frequencies} power={ch2Power} color="#82ca9d" />
        </div>
      )}

      {/* 3행: Band Power BarGraph */}
      {visible.band && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EEGBandPowerBarGraph channel="ch1" bandPowers={ch1BandPowers} />
          <EEGBandPowerBarGraph channel="ch2" bandPowers={ch2BandPowers} />
        </div>
      )}

      {/* 4행: EEG 지표 카드 7개 */}
      {visible.index && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <SingleValueCard title="Cognitive Load" value={eeg?.cognitive_load ?? 'N/A'} />
          <SingleValueCard title="Emotional Stability" value={eeg?.emotional_stability ?? 'N/A'} />
          <SingleValueCard title="Focus Index" value={eeg?.focus_index ?? 'N/A'} />
          <SingleValueCard title="Hemispheric Balance" value={eeg?.hemispheric_balance ?? 'N/A'} />
          <SingleValueCard title="Relaxation Index" value={eeg?.relaxation_index ?? 'N/A'} />
          <SingleValueCard title="Stress Index" value={eeg?.stress_index ?? 'N/A'} />
          <SingleValueCard title="Total Power" value={eeg?.total_power ?? 'N/A'} />
        </div>
      )}

      {/* PPG Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          PPG Graphs
        </h2>
        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={ppgAllOn} onClick={handlePPGAllToggle}>
            All
          </ToggleButton>
          <ToggleButton selected={ppgVisible.raw} onClick={() => setPPGVisible(v => ({ ...v, raw: !v.raw }))}>
            Raw Data
          </ToggleButton>
          <ToggleButton selected={ppgVisible.sqi} onClick={() => setPPGVisible(v => ({ ...v, sqi: !v.sqi }))}>
            SQI
          </ToggleButton>
          <ToggleButton selected={ppgVisible.index} onClick={() => setPPGVisible(v => ({ ...v, index: !v.index }))}>
            Index
          </ToggleButton>
        </div>
      </div>

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
          <SingleValueCard title="BPM" value={ppg?.bpm ?? 'N/A'} />
          <SingleValueCard title="SDNN" value={ppg?.sdnn ?? 'N/A'} />
          <SingleValueCard title="RMSSD" value={ppg?.rmssd ?? 'N/A'} />
          <SingleValueCard title="LF" value={ppg?.lf ?? 'N/A'} />
          <SingleValueCard title="HF" value={ppg?.hf ?? 'N/A'} />
          <SingleValueCard title="LF/HF" value={ppg?.lf_hf_ratio ?? 'N/A'} />
          <SingleValueCard title="PNN50" value={ppg?.pnn50 ?? 'N/A'} />
          <SingleValueCard title="SDSD" value={ppg?.sdsd ?? 'N/A'} />
        </div>
      )}

      {/* ACC Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          ACC Graphs
        </h2>
        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={accAllOn} onClick={handleACCAllToggle}>
            All
          </ToggleButton>
          <ToggleButton selected={accVisible.raw} onClick={() => setACCVisible(v => ({ ...v, raw: !v.raw }))}>
            Raw Data
          </ToggleButton>
          <ToggleButton selected={accVisible.index} onClick={() => setACCVisible(v => ({ ...v, index: !v.index }))}>
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
          <SingleValueCard title="Activity State" value={acc?.activity_state || 'Unknown'} />
          <SingleValueCard title="Average Movement" value={acc?.avg_movement || 0} />
          <SingleValueCard title="Standard Deviation Movement" value={acc?.std_movement || 0} />
          <SingleValueCard title="Max Movement" value={acc?.max_movement || 0} />
        </div>
      )}
    </div>
  );
}; 