import React, { useRef, useEffect, useMemo } from 'react';
import { Card } from '@mui/material';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';

interface EEGPreprocessedGraphProps {
  channel: 'ch1' | 'ch2';
}

const EEGPreprocessedGraph: React.FC<EEGPreprocessedGraphProps> = ({ channel }) => {
  const { eeg } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => {
    if (!eeg) return [];
    if (channel === 'ch1') return eeg.ch1_filtered || [];
    if (channel === 'ch2') return eeg.ch2_filtered || [];
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
        top: 23,
        right: 10,
        bottom: 10,
        left: 15,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Amplitude',
        nameLocation: 'middle',
        nameGap: 25,
        min: -200,
        max: 200,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 8
        },
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 9
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
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
        text: channel === 'ch1' ? 'Channel 1' : 'Channel 2',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 12,
          fontWeight: 600 
        },
        left: 'center',
        top: -5
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
    <Card sx={{ p: 2, height: '150px', width: '100%' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default EEGPreprocessedGraph; 