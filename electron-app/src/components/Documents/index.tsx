import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FileText, Search, Globe, Languages } from 'lucide-react';
import { useLanguageStore } from '../../stores/languageStore';
import { useTranslation } from '../../locales';
import { DocumentsSidebar } from './DocumentsSidebar';
import { DocumentsContent } from './DocumentsContent';

export type DocumentSection = 
  | 'quickStart' 
  | 'userGuide' 
  | 'dataManagement' 
  | 'apiReference' 
  | 'examples';

export type DocumentSubsection = string;

const Documents: React.FC = () => {
  const { currentLanguage, setLanguage } = useLanguageStore();
  const t = useTranslation(currentLanguage);
  
  const [activeSection, setActiveSection] = useState<DocumentSection>('quickStart');
  const [activeSubsection, setActiveSubsection] = useState<DocumentSubsection>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLanguageToggle = () => {
    setLanguage(currentLanguage === 'ko' ? 'en' : 'ko');
  };

  const handleNavigate = (section: string, subsection: string) => {
    setActiveSection(section as DocumentSection);
    setActiveSubsection(subsection);
  };

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-card">
        <DocumentsSidebar
          activeSection={activeSection}
          activeSubsection={activeSubsection}
          onSectionChange={setActiveSection}
          onSubsectionChange={setActiveSubsection}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-foreground" />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {t.documents.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t.documents.subtitle}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.documents.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLanguageToggle}
                className="flex items-center gap-2"
              >
                <Languages className="w-4 h-4" />
                {currentLanguage === 'ko' ? '한국어' : 'English'}
                <Globe className="w-3 h-3 opacity-50" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <DocumentsContent
            selectedSection={activeSection}
            selectedSubsection={activeSubsection}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </div>
  );
};

export default Documents; 