import React, { useRef, useEffect } from 'react';
import { Card, Typography, Box } from '@mui/material';
import * as echarts from 'echarts';

interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

interface EEGBandPowerBarGraphProps {
  channel: 'ch1' | 'ch2';
  bandPowers: BandPowers;
}

const EEGBandPowerBarGraph: React.FC<EEGBandPowerBarGraphProps> = ({ channel, bandPowers }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
      // ResizeObserver로 컨테이너 크기 변화 감지
      const resizeObserver = new window.ResizeObserver(() => {
        chartInstance.current?.resize();
      });
      resizeObserver.observe(chartRef.current);
      return () => {
        chartInstance.current?.dispose();
        resizeObserver.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    const values = bands.map(b => bandPowers[b as keyof BandPowers] || 0);
    const option = {
      animation: false,
      grid: { top: 20, right: 20, bottom: 10, left: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: bands.map(b => b.toUpperCase()),
        axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 8 },
        nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        name: 'Power 10*log10(μV²)',
        nameLocation: 'middle',
        nameGap: 25,
        min: 0,
        max: 60,
        axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 8 },
        nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: channel === 'ch1' ? '#8884d8' : '#82ca9d',
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '70%'
        }
      ],
      title: {
        text: `Channel ${channel === 'ch1' ? '1' : '2'} Band Powers`,
        textStyle: { color: 'rgba(255,255,255,0.7)' ,fontSize: 12, fontWeight: 600},
        left: 'center',
        fontSize: 10,
        fontWeight: 'bold'
      }
    };
    chartInstance.current.setOption(option);
  }, [bandPowers, channel]);

  return (
    <Card sx={{ p: 1, height: '190px', width: '100%' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default EEGBandPowerBarGraph; 