import React, { useRef, useEffect, useMemo } from 'react';
import { Card } from '@mui/material';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';

const ACCGraph: React.FC = () => {
  const { acc } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Calculate magnitude: sqrt(x^2 + y^2 + z^2)
  const magnitudeData = useMemo(() => {
    if (!acc?.x_change || !acc?.y_change || !acc?.z_change) return [];
    
    const xData = acc.x_change;
    const yData = acc.y_change;
    const zData = acc.z_change;
    
    // Ensure all arrays have the same length to avoid errors
    const minLength = Math.min(xData.length, yData.length, zData.length);
    const magnitudes = [];
    for (let i = 0; i < minLength; i++) {
      const x = xData[i] || 0; // Default to 0 if undefined (should not happen with minLength)
      const y = yData[i] || 0;
      const z = zData[i] || 0;
      magnitudes.push(Math.sqrt(x*x + y*y + z*z));
    }
    return magnitudes;
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
        bottom: 15,
        left: 20,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        show: false,
        data: magnitudeData.map((_, index) => index) // Generate category data for x-axis
      },
      yAxis: {
        type: 'value',
        max: 5000,
        name: 'Acceleration Magnitude', // Updated Y-axis name
        min: 0, // Magnitude is always non-negative
        // max: 3500, // Optional: Adjust max based on expected magnitude range or let ECharts auto-scale
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          show: false
        },
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      series: [
        {
          name: 'Magnitude', // Updated series name
          type: 'bar', // Changed to bar chart
          data: magnitudeData,
          itemStyle: { // Style for bars
            color: '#5470C6' // Example bar color, can be customized
          },
          barWidth: '60%' // Adjust bar width as needed
        }
      ],
      title: {
        text: 'Accelerometer Magnitude', // Updated title
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        left: 'center'
      },
      legend: {
        show: false // Hide legend as there is only one series now
      }
    };

    chartInstance.current.setOption(option);
  }, [magnitudeData]); // Changed dependency to magnitudeData

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card sx={{ p: 1, height: '150px' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default ACCGraph; 