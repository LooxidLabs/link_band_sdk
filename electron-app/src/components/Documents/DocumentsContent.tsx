import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useLanguageStore } from '../../stores/languageStore';
import { documentStructure } from '../../docs/structure';

interface DocumentsContentProps {
  selectedSection: string;
  selectedSubsection: string;
  onNavigate?: (section: string, subsection: string) => void;
}

export const DocumentsContent: React.FC<DocumentsContentProps> = ({
  selectedSection,
  selectedSubsection,
  onNavigate,
}) => {
  const { currentLanguage } = useLanguageStore();

  // 파일 경로에서 섹션과 서브섹션 찾기
  const findSectionAndSubsection = (path: string) => {
    // 경로에서 파일명 추출 (예: "first-steps" from "first-steps.md" or "../first-steps")
    const fileName = path.split('/').pop() || path;
    const cleanFileName = fileName.replace(/^\.\.\//, '').replace(/\.md$/, '');
    
    // documentStructure에서 해당 파일 찾기
    for (const section of documentStructure) {
      for (const subsection of section.subsections) {
        const subsectionFileName = subsection.filePath.split('/').pop()?.replace('.md', '');
        if (subsectionFileName === cleanFileName) {
          return { section: section.id, subsection: subsection.id };
        }
      }
    }
    
    // 찾지 못한 경우 현재 섹션 유지
    return null;
  };

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      const result = findSectionAndSubsection(path);
      if (result) {
        onNavigate(result.section, result.subsection);
      } else {
        console.warn('Could not find section/subsection for path:', path);
      }
    }
  };

  // 선택된 섹션과 서브섹션이 없으면 기본 개요 표시
  if (!selectedSection || !selectedSubsection) {
    const defaultFilePath = `${currentLanguage}/quick-start/overview.md`;
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <MarkdownRenderer 
            filePath={defaultFilePath} 
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    );
  }

  // documentStructure에서 실제 파일 경로 찾기
  const getFilePath = () => {
    for (const section of documentStructure) {
      if (section.id === selectedSection) {
        for (const subsection of section.subsections) {
          if (subsection.id === selectedSubsection) {
            return `${currentLanguage}/${subsection.filePath}`;
          }
        }
      }
    }
    // 파일을 찾지 못한 경우 기본값 반환
    return `${currentLanguage}/quick-start/overview.md`;
  };

  const filePath = getFilePath();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-12">
        <MarkdownRenderer 
          filePath={filePath} 
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}; 