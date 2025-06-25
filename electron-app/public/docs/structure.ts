export interface DocumentSection {
  id: string;
  title: string;
  subsections: DocumentSubsection[];
}

export interface DocumentSubsection {
  id: string;
  title: string;
  filePath: string; // 마크다운 파일 경로 (언어별로 자동 처리)
}

export const documentStructure: DocumentSection[] = [
  {
    id: 'quick-start',
    title: '빠른 시작',
    subsections: [
      {
        id: 'overview',
        title: '개요',
        filePath: 'quick-start/overview.md'
      },
      {
        id: 'system-requirements',
        title: '시스템 요구사항',
        filePath: 'quick-start/system-requirements.md'
      },
      {
        id: 'installation',
        title: '설치',
        filePath: 'quick-start/installation.md'
      },
      {
        id: 'first-steps',
        title: '첫 번째 단계',
        filePath: 'quick-start/first-steps.md'
      }
    ]
  },
  {
    id: 'user-guide',
    title: '사용자 가이드',
    subsections: [
      {
        id: 'engine-module',
        title: 'Engine 모듈',
        filePath: 'user-guide/engine-module.md'
      },
      {
        id: 'linkband-module',
        title: 'Link Band 모듈',
        filePath: 'user-guide/linkband-module.md'
      },
      {
        id: 'visualizer-module',
        title: 'Visualizer 모듈',
        filePath: 'user-guide/visualizer-module.md'
      },
      {
        id: 'datacenter-module',
        title: 'Data Center 모듈',
        filePath: 'user-guide/datacenter-module.md'
      }
    ]
  },
  {
    id: 'data-management',
    title: '데이터 관리',
    subsections: [
      {
        id: 'data-formats',
        title: '데이터 형식',
        filePath: 'data-management/data-formats.md'
      },
      {
        id: 'session-management',
        title: '세션 관리',
        filePath: 'data-management/session-management.md'
      },
      {
        id: 'export-options',
        title: '내보내기 옵션',
        filePath: 'data-management/export-options.md'
      },
      {
        id: 'storage-info',
        title: '저장소 정보',
        filePath: 'data-management/storage-info.md'
      }
    ]
  },
  {
    id: 'api-reference',
    title: 'API 참조',
    subsections: [
      {
        id: 'device-api',
        title: 'Device API',
        filePath: 'api-reference/device-api.md'
      },
      {
        id: 'stream-api',
        title: 'Stream API',
        filePath: 'api-reference/stream-api.md'
      },
      {
        id: 'data-api',
        title: 'Data API',
        filePath: 'api-reference/data-api.md'
      },
      {
        id: 'metrics-api',
        title: 'Metrics API',
        filePath: 'api-reference/metrics-api.md'
      },
      {
        id: 'websocket-integration',
        title: 'WebSocket 통합',
        filePath: 'api-reference/websocket-integration.md'
      }
    ]
  },
  {
    id: 'examples',
    title: '예제 및 FAQ',
    subsections: [
      {
        id: 'python-examples',
        title: 'Python 예제',
        filePath: 'examples/python-examples.md'
      },
      {
        id: 'react-integration',
        title: 'React 예제',
        filePath: 'examples/react-integration.md'
      },
      {
        id: 'nodejs-integration',
        title: 'Node.js 예제',
        filePath: 'examples/nodejs-integration.md'
      },
      {
        id: 'vue-integration',
        title: 'Vue.js 예제',
        filePath: 'examples/vue-integration.md'
      },
      {
        id: 'unity-integration',
        title: 'Unity 예제',
        filePath: 'examples/unity-integration.md'
      },
      {
        id: 'javascript-examples',
        title: 'JavaScript 예제',
        filePath: 'examples/javascript-examples.md'
      },
      {
        id: 'python-integration-advanced',
        title: 'Python 고급 예제',
        filePath: 'examples/python-integration-advanced.md'
      },
      {
        id: 'troubleshooting',
        title: '문제 해결 가이드',
        filePath: 'examples/troubleshooting.md'
      },
      {
        id: 'faq',
        title: '자주 묻는 질문',
        filePath: 'examples/faq.md'
      }
    ]
  }
];

// 언어별 번역
export const documentTitles = {
  ko: {
    'quick-start': '빠른 시작',
    'overview': '개요',
    'system-requirements': '시스템 요구사항',
    'installation': '설치',
    'first-steps': '첫 번째 단계',
    'user-guide': '사용자 가이드',
    'engine-module': 'Engine 모듈',
    'linkband-module': 'Link Band 모듈',
    'visualizer-module': 'Visualizer 모듈',
    'datacenter-module': 'Data Center 모듈',
    'data-management': '데이터 관리',
    'data-formats': '데이터 형식',
    'session-management': '세션 관리',
    'export-options': '내보내기 옵션',
    'storage-info': '저장소 정보',
    'api-reference': 'API 참조',
    'device-api': 'Device API',
    'stream-api': 'Stream API',
    'data-api': 'Data API',
    'metrics-api': 'Metrics API',
    'websocket-integration': 'WebSocket 통합',
    'examples': '예제 및 FAQ',
    'react-integration': 'React 예제',
    'vue-integration': 'Vue.js 예제',
    'nodejs-integration': 'Node.js 예제',
    'python-integration-advanced': 'Python 고급 예제',
    'unity-integration': 'Unity 예제',
    'python-examples': 'Python 예제',
    'javascript-examples': 'JavaScript 예제',
    'troubleshooting': '문제 해결 가이드',
    'faq': '자주 묻는 질문'
  },
  en: {
    'quick-start': 'Quick Start',
    'overview': 'Overview',
    'system-requirements': 'System Requirements',
    'installation': 'Installation',
    'first-steps': 'First Steps',
    'user-guide': 'User Guide',
    'engine-module': 'Engine Module',
    'linkband-module': 'Link Band Module',
    'visualizer-module': 'Visualizer Module',
    'datacenter-module': 'Data Center Module',
    'data-management': 'Data Management',
    'data-formats': 'Data Formats',
    'session-management': 'Session Management',
    'export-options': 'Export Options',
    'storage-info': 'Storage Information',
    'api-reference': 'API Reference',
    'device-api': 'Device API',
    'stream-api': 'Stream API',
    'data-api': 'Data API',
    'metrics-api': 'Metrics API',
    'websocket-integration': 'WebSocket Integration',
    'examples': 'Examples & FAQ',
    'python-examples': 'Python Examples',
    'react-integration': 'React Examples',
    'nodejs-integration': 'Node.js Examples',
    'vue-integration': 'Vue.js Examples',
    'unity-integration': 'Unity Examples',
    'javascript-examples': 'JavaScript Examples',
    'python-integration-advanced': 'Advanced Python Examples',
    'troubleshooting': 'Troubleshooting Guide',
    'faq': 'Frequently Asked Questions'
  }
}; 