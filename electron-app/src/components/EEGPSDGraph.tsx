import React, { useRef, useEffect } from 'react';
import { Card } from '@mui/material';
import * as echarts from 'echarts';

interface EEGPSDGraphProps {
  channel: 'ch1' | 'ch2';
  frequencies: number[];
  power: number[];
  color: string;
}

const EEGPSDGraph: React.FC<EEGPSDGraphProps> = ({ channel, frequencies, power, color }) => {
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
    const option = {
      animation: false,
      grid: {
        top: 25,
        right: 10,
        bottom: 10,
        left: 25,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: frequencies,
        name: 'Frequency (Hz)',
        nameLocation: 'middle',
        nameGap: 10,
        axisLabel: { color: 'rgba(255,255,255,0.7)' ,fontSize: 8},
        nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        name: 'Power 10*log10(μV²)',
        nameLocation: 'middle',
        nameGap: 25,
        min: 0,
        max: 60,
        interval: 20,
        splitNumber: 3,
        axisLabel: {
          color: 'rgba(255,255,255,0.7)',
          formatter: (value: number) => ([0, 20, 40, 60].includes(value) ? value : ''),
          fontSize: 8
        },
        nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 600 },
        splitLine: { show: true, interval: 0, lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: [
        {
          type: 'line',
          data: power,
          showSymbol: false,
          lineStyle: { width: 2, color },
        }
      ],
      title: {
        text: `Channel ${channel === 'ch1' ? '1' : '2'} Power Spectrum`,
        textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 },
        left: 'center'
      }
    };
    chartInstance.current.setOption(option);
  }, [frequencies, power, color, channel]);

  return (
    <Card sx={{ p: 2, height: '200px', width: '100%' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default EEGPSDGraph; 