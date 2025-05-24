import React, { useRef, useEffect, useMemo } from 'react';
import { Card } from '@mui/material';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';

const PPGGraph: React.FC = () => {
  const { ppg } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => {
    if (!ppg?.filtered_ppg) return [];
    return ppg.filtered_ppg;
  }, [ppg]);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    const option = {
      animation: false,
      grid: {
        top: 40,
        right: 20,
        bottom: 20,
        left: 30,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Filtered PPG',
        min: -150,
        max: 150,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
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
          name: 'PPG',
          type: 'line',
          data: data,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: '#ff7300'
          }
        }
      ],
      title: {
        text: 'Filtered PPG Data',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        left: 'center'
      }
    };

    chartInstance.current.setOption(option);
  }, [data]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card sx={{ p: 2, height: '200px' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default PPGGraph; 