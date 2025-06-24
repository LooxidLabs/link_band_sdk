import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  filePath: string;
  className?: string;
  onNavigate?: (path: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  filePath, 
  className,
  onNavigate 
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Electron 환경에서는 IPC를 사용하여 파일 읽기
        if ((window as any).electron?.fs?.readMarkdownFile) {
          const result = await (window as any).electron.fs.readMarkdownFile(filePath);
          
          if (result.success) {
            // marked 설정
            marked.setOptions({
              gfm: true, // GitHub Flavored Markdown 지원
              breaks: true, // 줄바꿈을 <br>로 변환
            });
            
            let html = await marked(result.content);
            
            // 후처리로 스타일 개선
            html = html
              // 헤딩 스타일 개선 (이모지 제거)
              .replace(/<h1>/g, '<h1 class="text-5xl font-bold leading-tight mb-10 mt-0 pb-6 border-b-2 border-gray-200 dark:border-gray-700">')
              .replace(/<h2>/g, '<h2 class="text-4xl font-bold leading-tight mt-12 mb-6 text-blue-600 dark:text-blue-400">')
              .replace(/<h3>/g, '<h3 class="text-3xl font-bold leading-snug mt-10 mb-5 text-gray-700 dark:text-gray-300">')
              .replace(/<h4>/g, '<h4 class="text-2xl font-bold leading-snug mt-8 mb-4 text-gray-600 dark:text-gray-400">')
              .replace(/<h5>/g, '<h5 class="text-xl font-bold leading-snug mt-6 mb-3 text-gray-600 dark:text-gray-400">')
              .replace(/<h6>/g, '<h6 class="text-lg font-bold leading-snug mt-6 mb-3 text-gray-600 dark:text-gray-400">')
              // 링크 스타일 개선 (이모지 제거)
              .replace(/<a href="([^"]*\.md[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 hover:decoration-blue-800 dark:hover:decoration-blue-300 font-medium transition-colors duration-200">')
              .replace(/<a href="(https?:\/\/[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-green-600 dark:text-green-400 underline decoration-2 underline-offset-2 hover:text-green-800 dark:hover:text-green-300 hover:decoration-green-800 dark:hover:decoration-green-300 font-medium transition-colors duration-200">')
              .replace(/<a href="(mailto:[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-purple-600 dark:text-purple-400 underline decoration-2 underline-offset-2 hover:text-purple-800 dark:hover:text-purple-300 hover:decoration-purple-800 dark:hover:decoration-purple-300 font-medium transition-colors duration-200">')
              .replace(/<a href="([^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300 hover:decoration-indigo-800 dark:hover:decoration-indigo-300 font-medium transition-colors duration-200">')
                          // 코드 블록 스타일 개선 (macOS 스타일)
            .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, 
              '<div class="code-block-wrapper my-6 rounded-xl overflow-hidden shadow-lg border border-gray-700 dark:border-gray-600"><div class="code-block-header flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-200 px-4 py-3 border-b border-gray-700 dark:border-gray-600"><span class="flex items-center gap-2"><span class="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-green-500 rounded-full shadow-sm"></span></span><span class="text-gray-400 text-sm font-mono">$1</span></div><pre class="!mt-0 !mb-0 !rounded-none bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto"><code class="language-$1 text-sm leading-relaxed">$2</code></pre></div>')
            .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, 
              '<div class="code-block-wrapper my-6 rounded-xl overflow-hidden shadow-lg border border-gray-700 dark:border-gray-600"><div class="code-block-header flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-200 px-4 py-3 border-b border-gray-700 dark:border-gray-600"><span class="flex items-center gap-2"><span class="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-green-500 rounded-full shadow-sm"></span></span><span class="text-gray-400 text-sm font-mono">code</span></div><pre class="!mt-0 !mb-0 !rounded-none bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto"><code class="text-sm leading-relaxed">$1</code></pre></div>')
              // 인라인 코드 스타일 개선
              .replace(/<code>([^<]+)<\/code>/g, '<code class="inline-code px-2 py-1 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono font-medium">$1</code>')
              // 리스트 아이템 스타일 개선
              .replace(/<li>/g, '<li class="flex items-start gap-2"><span class="text-blue-500 mt-1.5 flex-shrink-0">•</span><span>')
              .replace(/<\/li>/g, '</span></li>')
              // 인용구 스타일 개선
              .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 my-4 italic">')
              // 테이블 스타일 개선
              .replace(/<table>/g, '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-200 dark:border-gray-700">')
              .replace(/<\/table>/g, '</table></div>')
              .replace(/<th>/g, '<th class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 text-left font-semibold">')
              .replace(/<td>/g, '<td class="border border-gray-200 dark:border-gray-700 px-4 py-2">');
            
                         setContent(html);
          } else {
            throw new Error(result.error || `Failed to load ${filePath}`);
          }
        } else {
          // 웹 환경에서는 fetch 사용 (개발 서버)
          const response = await fetch(`/docs/${filePath}`);
          if (!response.ok) {
            throw new Error(`Failed to load ${filePath}`);
          }
          
          const markdown = await response.text();
          
          // marked 설정
          marked.setOptions({
            gfm: true, // GitHub Flavored Markdown 지원
            breaks: true, // 줄바꿈을 <br>로 변환
          });
          
          let html = await marked(markdown);
          
          // 후처리로 스타일 개선
          html = html
            // 헤딩 스타일 개선 (이모지 제거)
            .replace(/<h1>/g, '<h1 class="text-5xl font-bold leading-tight mb-10 mt-0 pb-6 border-b-2 border-gray-200 dark:border-gray-700">')
            .replace(/<h2>/g, '<h2 class="text-4xl font-bold leading-tight mt-12 mb-6 text-blue-600 dark:text-blue-400">')
            .replace(/<h3>/g, '<h3 class="text-3xl font-bold leading-snug mt-10 mb-5 text-gray-700 dark:text-gray-300">')
            .replace(/<h4>/g, '<h4 class="text-2xl font-bold leading-snug mt-8 mb-4 text-gray-600 dark:text-gray-400">')
            .replace(/<h5>/g, '<h5 class="text-xl font-bold leading-snug mt-6 mb-3 text-gray-600 dark:text-gray-400">')
            .replace(/<h6>/g, '<h6 class="text-lg font-bold leading-snug mt-6 mb-3 text-gray-600 dark:text-gray-400">')
            // 링크 스타일 개선 (이모지 제거)
            .replace(/<a href="([^"]*\.md[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 hover:decoration-blue-800 dark:hover:decoration-blue-300 font-medium transition-colors duration-200">')
            .replace(/<a href="(https?:\/\/[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-green-600 dark:text-green-400 underline decoration-2 underline-offset-2 hover:text-green-800 dark:hover:text-green-300 hover:decoration-green-800 dark:hover:decoration-green-300 font-medium transition-colors duration-200">')
            .replace(/<a href="(mailto:[^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-purple-600 dark:text-purple-400 underline decoration-2 underline-offset-2 hover:text-purple-800 dark:hover:text-purple-300 hover:decoration-purple-800 dark:hover:decoration-purple-300 font-medium transition-colors duration-200">')
            .replace(/<a href="([^"]*)"([^>]*)>/g, '<a href="$1"$2 class="text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300 hover:decoration-indigo-800 dark:hover:decoration-indigo-300 font-medium transition-colors duration-200">')
            // 코드 블록 스타일 개선 (macOS 스타일)
            .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, 
              '<div class="code-block-wrapper my-6 rounded-xl overflow-hidden shadow-lg border border-gray-700 dark:border-gray-600"><div class="code-block-header flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-200 px-4 py-3 border-b border-gray-700 dark:border-gray-600"><span class="flex items-center gap-2"><span class="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-green-500 rounded-full shadow-sm"></span></span><span class="text-gray-400 text-sm font-mono">$1</span></div><pre class="!mt-0 !mb-0 !rounded-none bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto"><code class="language-$1 text-sm leading-relaxed">$2</code></pre></div>')
            .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, 
              '<div class="code-block-wrapper my-6 rounded-xl overflow-hidden shadow-lg border border-gray-700 dark:border-gray-600"><div class="code-block-header flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-200 px-4 py-3 border-b border-gray-700 dark:border-gray-600"><span class="flex items-center gap-2"><span class="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></span><span class="w-3 h-3 bg-green-500 rounded-full shadow-sm"></span></span><span class="text-gray-400 text-sm font-mono">code</span></div><pre class="!mt-0 !mb-0 !rounded-none bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto"><code class="text-sm leading-relaxed">$1</code></pre></div>')
            // 인라인 코드 스타일 개선
            .replace(/<code>([^<]+)<\/code>/g, '<code class="inline-code px-2 py-1 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono font-medium">$1</code>')
            // 리스트 아이템 스타일 개선
            .replace(/<li>/g, '<li class="flex items-start gap-2"><span class="text-blue-500 mt-1.5 flex-shrink-0">•</span><span>')
            .replace(/<\/li>/g, '</span></li>')
            // 인용구 스타일 개선
            .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 my-4 italic">')
            // 테이블 스타일 개선
            .replace(/<table>/g, '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-200 dark:border-gray-700">')
            .replace(/<\/table>/g, '</table></div>')
            .replace(/<th>/g, '<th class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 text-left font-semibold">')
            .replace(/<td>/g, '<td class="border border-gray-200 dark:border-gray-700 px-4 py-2">');
          
          setContent(html);
        }
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      loadMarkdown();
    }
  }, [filePath]);

  // 링크 클릭 이벤트 핸들러
  useEffect(() => {
    const handleLinkClick = (event: Event) => {
      const target = event.target as HTMLAnchorElement;
      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        
        if (href) {
          // 외부 링크인지 확인 (http, https, mailto 등)
          if (href.startsWith('http') || href.startsWith('https') || href.startsWith('mailto:')) {
            event.preventDefault();
            
            // 먼저 Electron의 shell.openExternal 시도
            if ((window as any).electron?.shell?.openExternal) {
              try {
                (window as any).electron.shell.openExternal(href);
                return;
              } catch (error) {
                console.warn('Failed to open external link with Electron shell:', error);
              }
            }
            
            // Electron이 실패하거나 웹 환경인 경우 새 창으로 시도
            try {
              window.open(href, '_blank', 'noopener,noreferrer');
              return;
            } catch (error) {
              console.warn('Failed to open external link in new window:', error);
            }
            
            // 모든 방법이 실패하면 클립보드에 복사
            try {
              navigator.clipboard.writeText(href).then(() => {
                alert(`링크를 클립보드에 복사했습니다:\n${href}`);
              }).catch(() => {
                // 클립보드 API가 실패하면 fallback
                const textArea = document.createElement('textarea');
                textArea.value = href;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert(`링크를 클립보드에 복사했습니다:\n${href}`);
              });
            } catch (error) {
              // 모든 방법이 실패하면 링크를 표시
              alert(`링크를 열 수 없습니다. 수동으로 복사하세요:\n${href}`);
            }
          }
          // 내부 링크인지 확인 (.md 파일 또는 상대 경로)
          else if (href.endsWith('.md') || (!href.startsWith('http') && !href.startsWith('mailto:'))) {
            event.preventDefault();
            
            if (onNavigate) {
              // .md 확장자 제거하고 경로 정규화
              const cleanPath = href.replace('.md', '');
              onNavigate(cleanPath);
            } else {
              // onNavigate가 없으면 경고 로그만 출력
              console.warn('Internal link clicked but no navigation handler provided:', href);
            }
          }
          // 기타 링크는 기본 동작 수행 (하지만 이미 처리되었으므로 여기까지 오지 않음)
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleLinkClick);
      
      return () => {
        contentElement.removeEventListener('click', handleLinkClick);
      };
    }
  }, [onNavigate, content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">문서를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
        <p className="text-red-800 dark:text-red-200 font-medium">문서 로딩 오류</p>
        <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const defaultClassName = `
    markdown-content
    prose prose-xl prose-slate dark:prose-invert max-w-none
    prose-p:text-2xl prose-p:text-muted-foreground prose-p:mb-10 prose-p:tracking-wide
    [&_p]:leading-[2.2] [&_p]:space-y-1
    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-blue-800 dark:hover:prose-a:text-blue-300 prose-a:font-semibold prose-a:transition-all prose-a:duration-200
    prose-strong:text-foreground prose-strong:font-bold
    prose-em:text-foreground prose-em:italic
    prose-code:text-lg prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 
    prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:font-medium
    prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:border-0
    prose-pre:text-sm prose-pre:leading-relaxed prose-pre:p-0 prose-pre:m-0
    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20
    prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-10 prose-blockquote:italic prose-blockquote:text-blue-800 dark:prose-blockquote:text-blue-200
    prose-blockquote:text-2xl prose-blockquote:leading-loose
    prose-ul:space-y-5 prose-ol:space-y-5 prose-ul:my-10 prose-ol:my-10
    prose-li:text-2xl prose-li:text-muted-foreground prose-li:tracking-wide
    [&_li]:leading-[2.2]
    prose-table:border-collapse prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-table:my-10
    prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 
    prose-th:px-6 prose-th:py-4 prose-th:text-xl prose-th:font-bold prose-th:text-left
    prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:px-6 prose-td:py-4 prose-td:text-xl
    prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700 prose-img:my-10
    prose-hr:border-gray-300 dark:prose-hr:border-gray-600 prose-hr:my-14
  `.trim();

  return (
    <div className="markdown-wrapper">
      {/* 문서 헤더 */}
      <div className="mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filePath.split('/').pop()?.replace('.md', '') || 'Document'}</span>
        </div>
      </div>
      
      {/* 마크다운 콘텐츠 */}
      <div 
        className={`${className || defaultClassName} markdown-enhanced-links`}
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          // 커스텀 CSS 변수 정의
          '--link-underline-thickness': '2px',
          '--link-underline-offset': '4px',
          '--link-hover-thickness': '3px',
          '--link-hover-offset': '2px',
        } as React.CSSProperties}
      />
      
      {/* 문서 푸터 */}
      <div className="mt-12 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Link Band SDK Documentation</span>
          <span>© 2024 Looxid Labs</span>
        </div>
      </div>
      
      {/* 인라인 스타일로 링크 강화 및 코드 블록 개선 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .markdown-enhanced-links a {
            position: relative !important;
            text-decoration: underline !important;
            text-decoration-thickness: 2px !important;
            text-underline-offset: 4px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease-in-out !important;
          }
          
          .markdown-enhanced-links a:hover {
            text-decoration-thickness: 3px !important;
            text-underline-offset: 2px !important;
            transform: translateY(-1px);
          }
          
          /* 코드 블록 개선 */
          .code-block-wrapper {
            margin: 1.5rem 0 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            border: 1px solid rgba(75, 85, 99, 0.3) !important;
          }
          
          .code-block-header {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
            border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
            padding: 12px 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          
          .code-block-wrapper pre {
            background: #0f172a !important;
            margin: 0 !important;
            padding: 20px !important;
            overflow-x: auto !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            color: #e2e8f0 !important;
          }
          
          .code-block-wrapper code {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
            font-size: inherit !important;
            color: inherit !important;
            background: transparent !important;
            padding: 0 !important;
          }
          
          /* 인라인 코드 스타일 */
          .inline-code {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
            font-size: 0.875rem !important;
            padding: 3px 6px !important;
            border-radius: 4px !important;
            background: rgba(156, 163, 175, 0.15) !important;
            border: 1px solid rgba(156, 163, 175, 0.2) !important;
          }
          
          /* 다크 모드에서 인라인 코드 */
          .dark .inline-code {
            background: rgba(75, 85, 99, 0.3) !important;
            border: 1px solid rgba(75, 85, 99, 0.4) !important;
          }
          
          /* 스크롤바 스타일링 */
          .code-block-wrapper pre::-webkit-scrollbar {
            height: 6px;
          }
          
          .code-block-wrapper pre::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.5);
            border-radius: 3px;
          }
          
          .code-block-wrapper pre::-webkit-scrollbar-thumb {
            background: rgba(71, 85, 105, 0.8);
            border-radius: 3px;
          }
          
          .code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.9);
          }
        `
      }} />
    </div>
  );
}; 