import React, { useState } from 'react';
import { Form, DatePicker, Select, Progress, message, Button } from 'antd';
import type { ExportParams } from '../../types/data-center';
import styles from './DataCenter.module.css';

const { RangePicker } = DatePicker;

interface ExportModalProps {
  onExport: (params: ExportParams) => Promise<void>;
  loading: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  onExport,
  loading
}) => {
  const [form] = Form.useForm();
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setExportProgress(0);
      
      await onExport(values as ExportParams);
      
      message.success('데이터 내보내기가 완료되었습니다.');
      form.resetFields();
    } catch (error) {
      message.error('데이터 내보내기에 실패했습니다.');
    }
  };

  return (
    <div className={styles.exportModal}>
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="내보낼 기간"
          name="dateRange"
          rules={[{ required: true, message: '기간을 선택해주세요' }]}
        >
          <RangePicker />
        </Form.Item>

        <Form.Item
          label="파일 형식"
          name="fileTypes"
        >
          <Select mode="multiple" placeholder="선택하세요">
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="csv">CSV</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="내보내기 형식"
          name="exportFormat"
          initialValue="zip"
        >
          <Select>
            <Select.Option value="zip">ZIP</Select.Option>
            <Select.Option value="tar">TAR</Select.Option>
          </Select>
        </Form.Item>

        {loading && (
          <Progress percent={exportProgress} status="active" />
        )}

        <div className={styles.exportActions}>
          <Button
            type="primary"
            onClick={handleExport}
            loading={loading}
          >
            내보내기
          </Button>
        </div>
      </Form>
    </div>
  );
}; 