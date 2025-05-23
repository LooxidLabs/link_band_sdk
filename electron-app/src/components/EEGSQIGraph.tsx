import React, { useRef, useEffect, useMemo } from 'react';
import { Card, Typography } from '@mui/material';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';

interface EEGSQIGraphProps {
  channel: 'ch1' | 'ch2';
}

const EEGSQIGraph: React.FC<EEGSQIGraphProps> = ({ channel }) => {
  const { eeg } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => {
    if (!eeg) return [];
    if (channel === 'ch1') return eeg.ch1_sqi || [];
    if (channel === 'ch2') return eeg.ch2_sqi || [];
    return [];
  }, [eeg, channel]);

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
        top: 20,
        right: 10,
        bottom: 10,
        left: 25,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        show: true,
        boundaryGap: true
      },
      yAxis: {
        type: 'value',
        name: 'SQI',
        nameLocation: 'middle',
        nameGap: 10,
        min: 0,
        max: 1,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)',
            width: 1
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: (value: number) => (value=== 1 ? 'Good': value < 1 ? value === 0 ? 'Bad' : '' : ''),
          fontSize: 8
        },
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 8
        },
        splitLine: {
          show: false
        }
      },
      series: [
        {
          type: 'line',
          data: data,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: channel === 'ch1' ? '#8884d8' : '#82ca9d'
          }
        }
      ],
      title: {
        text: channel === 'ch1' ? 'Channel 1 Signal Quality' : 'Channel 2 Signal Quality',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 12,
          fontWeight: 600

        },
        top: 0,
        left: 'center'
      }
    };
    chartInstance.current.setOption(option);
  }, [data, channel]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card sx={{ p: 1, height: '120px' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100px' }} />
    </Card>
  );
};

export default EEGSQIGraph; 