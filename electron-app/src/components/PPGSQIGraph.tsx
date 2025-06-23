import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { useSensorStore } from '../stores/sensor';
import { Card } from './ui/card';

const PPGSQIGraph: React.FC = () => {
  const { ppg } = useSensorStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => {
    return ppg?.ppg_sqi || [];
  }, [ppg]);

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
      backgroundColor: '#161822',
      animation: false,
      grid: {
        top: 20,
        right: 10,
        bottom: 10,
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
        name: 'PPG SQI',
        nameLocation: 'middle',
        nameGap: 10,
        min: 0,
        max: 1,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: (value: number) => (value === 1 ? "Good" : (value === 0 ? "Bad" : ''))
        },
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
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
            color: '#ff7300'
          },
          areaStyle: {
            color: 'rgba(255, 115, 0, 0.2)'
          }
        }
      ],
      title: {
        text: 'PPG SQI',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        left: 'center'
      }
    };
    chartInstance.current.setOption(option);
  }, [data]);

  return (
    <Card className="bg-card p-4 h-[150px] w-full">
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </Card>
  );
};

export default PPGSQIGraph; 