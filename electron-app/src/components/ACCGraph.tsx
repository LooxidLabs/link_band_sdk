import React, { useRef, useEffect, useMemo } from 'react';
import { Card, Typography } from '@mui/material';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';

const ACCGraph: React.FC = () => {
  const { acc } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => {
    if (!acc?.x_change || !acc?.y_change || !acc?.z_change) return { x: [], y: [], z: [] };
    
    return {
      x: acc.x_change,
      y: acc.y_change,
      z: acc.z_change,
    };
  }, [acc]);

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
        top: 50,
        right:10,
        bottom: 30,
        left: 20,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Acceleration',
        min: -2000,
        max: 2000,
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
          name: 'X-axis',
          type: 'line',
          data: data.x,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: '#ff0000'
          }
        },
        {
          name: 'Y-axis',
          type: 'line',
          data: data.y,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: '#00ff00'
          }
        },
        {
          name: 'Z-axis',
          type: 'line',
          data: data.z,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: '#0000ff'
          }
        }
      ],
      title: {
        text: 'Accelerometer Data',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        left: 'center'
      },
      legend: {
        data: ['X-axis', 'Y-axis', 'Z-axis'],
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        top: 30
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
    <Card sx={{ p: 1, height: '200px' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default ACCGraph; 