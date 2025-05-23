import React, { useState } from 'react';
import { Card, Typography, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSensorStore } from '../stores/sensor';
import EEGPreprocessedGraph from './EEGPreprocessedGraph';
import EEGPSDGraph from './EEGPSDGraph';
import PPGGraph from './PPGGraph';
import ACCGraph from './ACCGraph';
import EEGBandPowerBarGraph from './EEGBandPowerBarGraph';
import EEGSQIGraph from './EEGSQIGraph';
import PPGSQIGraph from './PPGSQIGraph';
import DashboardIcon from '@mui/icons-material/BarChart';

const SingleValueCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <Card sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: 12, fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant="h6" sx={{ fontSize: 12, fontWeight: 600 }}>
      {typeof value === 'number' ? value.toFixed(2) : value}
    </Typography>
  </Card>
);

const BandPowerCard: React.FC<{ title: string; powers: { delta: number; theta: number; alpha: number; beta: number; gamma: number } }> = ({ title, powers }) => (
  <Card sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {Object.entries(powers).map(([band, power]) => (
        <Box key={band} sx={{ flex: '1 1 30%', minWidth: '100px' }}>
          <Typography variant="caption" color="text.secondary">
            {band.toUpperCase()}
          </Typography>
          <Typography variant="body2">
            {power.toFixed(2)}
          </Typography>
        </Box>
      ))}
    </Box>
  </Card>
);

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
  const ch1Filtered = eeg?.ch1_filtered || [];
  const ch2Filtered = eeg?.ch2_filtered || [];
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

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mb: 2 }}>
        <DashboardIcon sx={{ fontSize: 32, color: '#fff', mr: 1 }} />
        <Typography variant="h6" gutterBottom sx={{ width: '100%', fontWeight: 600, fontSize: 28 }}>
          Processed Data Visualizer
        </Typography>
      </Box>

      {/* EEG Section Toggle Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="h6" gutterBottom sx={{ mt: 1, mb: 1, ml: 2, fontWeight: 600, color: '#FFF' }}>
          EEG Graphs
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <ToggleButton
            value="all"
            selected={allOn}
            onClick={handleAllToggle}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: allOn ? '#4CAF50' : '#222',
              color: allOn ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            All
          </ToggleButton>
          <ToggleButton
            value="raw"
            selected={visible.raw}
            onClick={() => handleToggle('raw')}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: visible.raw ? '#4CAF50' : '#222',
              color: visible.raw ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Raw Data
          </ToggleButton>
          <ToggleButton
            value="sqi"
            selected={visible.sqi}
            onClick={() => handleToggle('sqi')}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: visible.sqi ? '#4CAF50' : '#222',
              color: visible.sqi ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            SQI
          </ToggleButton>
          <ToggleButton
            value="psd"
            selected={visible.psd}
            onClick={() => handleToggle('psd')}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: visible.psd ? '#4CAF50' : '#222',
              color: visible.psd ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            PSD
          </ToggleButton>
          <ToggleButton
            value="band"
            selected={visible.band}
            onClick={() => handleToggle('band')}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: visible.band ? '#4CAF50' : '#222',
              color: visible.band ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Band Power
          </ToggleButton>
          <ToggleButton
            value="index"
            selected={visible.index}
            onClick={() => handleToggle('index')}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: visible.index ? '#4CAF50' : '#222',
              color: visible.index ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Index
          </ToggleButton>
        </Box>
      </Box>

      {/* 1행: Filtered EEG (Raw Data) */}
      {visible.raw && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
              <EEGPreprocessedGraph channel="ch1" />
          </Box>
          <Box sx={{ flex: 1 }}>
              <EEGPreprocessedGraph channel="ch2" />
          </Box>
        </Box>
      )}
      {/* SQI 그래프 */}
      {visible.sqi && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
              <EEGSQIGraph channel="ch1" />
          </Box>
          <Box sx={{ flex: 1 }}>
              <EEGSQIGraph channel="ch2" />
          </Box>
        </Box>
      )}
      {/* 2행: Power Spectrum */}
      {visible.psd && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <EEGPSDGraph channel="ch1" frequencies={frequencies} power={ch1Power} color="#8884d8" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <EEGPSDGraph channel="ch2" frequencies={frequencies} power={ch2Power} color="#82ca9d" />
          </Box>
        </Box>
      )}
      {/* 3행: Band Power BarGraph */}
      {visible.band && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <EEGBandPowerBarGraph channel="ch1" bandPowers={ch1BandPowers} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <EEGBandPowerBarGraph channel="ch2" bandPowers={ch2BandPowers} />
          </Box>
        </Box>
      )}
      {/* 4행: EEG 지표 카드 7개 */}
      {visible.index && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Cognitive Load" value={eeg?.cognitive_load ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Emotional Stability" value={eeg?.emotional_stability ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Focus Index" value={eeg?.focus_index ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Hemispheric Balance" value={eeg?.hemispheric_balance ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Relaxation Index" value={eeg?.relaxation_index ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Stress Index" value={eeg?.stress_index ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Total Power" value={eeg?.total_power ?? 'N/A'} />
          </Box>
        </Box>
      )}

      {/* PPG Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1, ml: 2, fontWeight: 600, color: '#FFF' }}>
          PPG Graphs
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <ToggleButton
            value="all"
            selected={ppgAllOn}
            onClick={handlePPGAllToggle}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: ppgAllOn ? '#4CAF50' : '#222',
              color: ppgAllOn ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            All
          </ToggleButton>
          <ToggleButton
            value="raw"
            selected={ppgVisible.raw}
            onClick={() => setPPGVisible(v => ({ ...v, raw: !v.raw }))}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: ppgVisible.raw ? '#4CAF50' : '#222',
              color: ppgVisible.raw ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Raw Data
          </ToggleButton>
          <ToggleButton
            value="sqi"
            selected={ppgVisible.sqi}
            onClick={() => setPPGVisible(v => ({ ...v, sqi: !v.sqi }))}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: ppgVisible.sqi ? '#4CAF50' : '#222',
              color: ppgVisible.sqi ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            SQI
          </ToggleButton>
          <ToggleButton
            value="index"
            selected={ppgVisible.index}
            onClick={() => setPPGVisible(v => ({ ...v, index: !v.index }))}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: ppgVisible.index ? '#4CAF50' : '#222',
              color: ppgVisible.index ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Index
          </ToggleButton>
        </Box>
      </Box>
      {/* PPG 그래프/카드 조건부 렌더링 */}
      {ppgVisible.raw && (
        <Box sx={{ flex: 1, width: '100%', mb: 2 }}>
          <PPGGraph />
        </Box>
      )}
      {ppgVisible.sqi && (
        <Box sx={{ flex: 1, width: '100%', mb: 2 }}>
            <PPGSQIGraph />
        </Box>
      )}
      {ppgVisible.index && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="BPM" value={ppg?.bpm ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="SDNN" value={ppg?.sdnn ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="RMSSD" value={ppg?.rmssd ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="LF" value={ppg?.lf ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="HF" value={ppg?.hf ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="LF/HF" value={ppg?.lf_hf_ratio ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="PNN50" value={ppg?.pnn50 ?? 'N/A'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="SDSD" value={ppg?.sdsd ?? 'N/A'} />
          </Box>
        </Box>
      )}

      {/* ACC Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1, ml: 2, fontWeight: 600, color: '#FFF' }}>
          ACC Graphs
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <ToggleButton
            value="all"
            selected={accAllOn}
            onClick={handleACCAllToggle}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: accAllOn ? '#4CAF50' : '#222',
              color: accAllOn ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            All
          </ToggleButton>
          <ToggleButton
            value="raw"
            selected={accVisible.raw}
            onClick={() => setACCVisible(v => ({ ...v, raw: !v.raw }))}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: accVisible.raw ? '#4CAF50' : '#222',
              color: accVisible.raw ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Raw Data
          </ToggleButton>
          <ToggleButton
            value="index"
            selected={accVisible.index}
            onClick={() => setACCVisible(v => ({ ...v, index: !v.index }))}
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.7,
              backgroundColor: accVisible.index ? '#4CAF50' : '#222',
              color: accVisible.index ? '#fff' : '#aaa',
              border: 'none',
              fontWeight: 600,
              fontSize: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Index
          </ToggleButton>
        </Box>
      </Box>
      {/* ACC 그래프/카드 조건부 렌더링 */}
      {accVisible.raw && (
        <Box sx={{ flex: 1, width: '100%', mb: 2 }}>
          <ACCGraph />
        </Box>
      )}
      {accVisible.index && (
        <Box sx={{ display: 'flex', gap: 2, width: '100%', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Activity State" value={acc?.activity_state || 'Unknown'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Average Movement" value={acc?.avg_movement || 0} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Standard Deviation Movement" value={acc?.std_movement || 0} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SingleValueCard title="Max Movement" value={acc?.max_movement || 0} />
          </Box>
        </Box>
      )}
    </Box>
  );
}; 