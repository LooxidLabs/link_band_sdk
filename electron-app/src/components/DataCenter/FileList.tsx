import React from 'react';
import { Table, Button, Space, Tooltip } from 'antd';
import { 
  FolderOpenOutlined, 
  CopyOutlined,
  FileOutlined 
} from '@ant-design/icons';
import type { FileInfo } from '../../types/data-center';
import styles from './DataCenter.module.css';

interface FileListProps {
  files: FileInfo[];
  loading: boolean;
  onFileOpen: (file: FileInfo) => void;
  onCopyPath: (file: FileInfo) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  loading,
  onFileOpen,
  onCopyPath
}) => {
  const columns = [
    {
      title: '파일명',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '크기',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '액션',
      key: 'action',
      render: (_: any, record: FileInfo) => (
        <Space>
          <Tooltip title="파일 위치 열기">
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => onFileOpen(record)}
              disabled={!record.is_accessible}
            />
          </Tooltip>
          <Tooltip title="경로 복사">
            <Button
              icon={<CopyOutlined />}
              onClick={() => onCopyPath(record)}
              disabled={!record.is_accessible}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={files}
      loading={loading}
      rowKey="file_id"
      className={styles.fileList}
    />
  );
}; 