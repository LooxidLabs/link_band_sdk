import React from 'react';
import { Table, Button, Space } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { ExportHistory as ExportHistoryType } from '../../types/data-center';
import styles from './DataCenter.module.css';

interface ExportHistoryProps {
  history: ExportHistoryType[];
  loading: boolean;
}

export const ExportHistory: React.FC<ExportHistoryProps> = ({
  history,
  loading
}) => {
  const handleOpenFolder = async (path: string) => {
    try {
      if ((window as any).electron && (window as any).electron.shell && (window as any).electron.shell.openPath) {
        await (window as any).electron.shell.openPath(path);
      } else {
        console.error('Electron shell.openPath API not available.');
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const columns = [
    {
      title: '내보내기 시간',
      dataIndex: 'exported_at',
      key: 'exported_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '파일 수',
      dataIndex: 'file_count',
      key: 'file_count',
    },
    {
      title: '파일 크기',
      dataIndex: 'total_size',
      key: 'total_size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: '내보내기 형식',
      dataIndex: 'export_format',
      key: 'export_format',
    },
    {
      title: '액션',
      key: 'action',
      render: (_: unknown, record: ExportHistoryType) => (
        <Space>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => handleOpenFolder(record.export_path)}
          >
            폴더 열기
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={history}
      loading={loading}
      rowKey="id"
      className={styles.fileList}
    />
  );
}; 