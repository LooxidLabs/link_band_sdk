import React from 'react';
import { 
  Button, 
  Space, 
  Card,
  Tabs
} from 'antd';
import { 
  DownloadOutlined, 
  HistoryOutlined
} from '@ant-design/icons';
import { useDataCenterStore } from '../../stores/dataCenter';
import { ExportModal } from './ExportModal';
import { FileList } from './FileList.tsx';
import { ExportHistory } from './ExportHistory.tsx';
import { SearchFilters } from './SearchFilters.tsx';
import styles from './DataCenter.module.css';

const { TabPane } = Tabs;

const DataCenter: React.FC = () => {
  const {
    files,
    loading,
    exportHistory,
    searchParams,
    activeTab,
    setActiveTab,
    setSearchParams,
    searchFiles,
    exportData,
    openFile,
    copyFilePath
  } = useDataCenterStore();

  return (
    <div className={styles.dataCenter}>
      <Card className={styles.header}>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => setActiveTab('export')}
          >
            데이터 내보내기
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setActiveTab('history')}
          >
            내보내기 히스토리
          </Button>
        </Space>
      </Card>

      <Card className={styles.content}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="파일 목록" key="files">
            <SearchFilters
              onSearch={searchFiles}
              searchParams={searchParams}
              onSearchParamsChange={setSearchParams}
            />
            <FileList
              files={files}
              loading={loading}
              onFileOpen={openFile}
              onCopyPath={copyFilePath}
            />
          </TabPane>
          
          <TabPane tab="데이터 내보내기" key="export">
            <ExportModal
              onExport={exportData}
              loading={loading}
            />
          </TabPane>
          
          <TabPane tab="내보내기 히스토리" key="history">
            <ExportHistory
              history={exportHistory}
              loading={loading}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DataCenter; 