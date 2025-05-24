import React from 'react';
import { Form, Input, DatePicker, Select, Space, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { SearchParams } from '../../types/data-center';
import styles from './DataCenter.module.css';

const { RangePicker } = DatePicker;

interface SearchFiltersProps {
  onSearch: (params: SearchParams) => void;
  searchParams: SearchParams;
  onSearchParamsChange: (params: SearchParams) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  searchParams,
  onSearchParamsChange
}) => {
  const [form] = Form.useForm();

  const handleSearch = (values: SearchParams) => {
    onSearchParamsChange(values);
    onSearch(values);
  };

  return (
    <Form
      form={form}
      onFinish={handleSearch}
      className={styles.searchFilters}
    >
      <Space>
        <Form.Item name="dateRange">
          <RangePicker />
        </Form.Item>
        
        <Form.Item name="fileTypes">
          <Select
            mode="multiple"
            placeholder="파일 형식"
            style={{ width: 200 }}
          >
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="csv">CSV</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="searchText">
          <Input
            placeholder="파일명 검색"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit">
            검색
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
}; 