import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right' | 'center';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, title, position = 'center' }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        // Tooltip appears more to the right for left-side elements
        return 'left-0 transform-none';
      case 'right':
        // Tooltip appears more to the left for right-side elements
        return 'right-0 transform-none';
      case 'center':
      default:
        // Default center position
        return 'left-1/2 transform -translate-x-1/2';
    }
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div className={`absolute bottom-full ${getPositionClasses()} mb-3 hidden group-hover:block w-96 max-h-[32rem] overflow-y-auto bg-gray-900 text-gray-100 text-sm rounded-xl shadow-2xl z-50 border border-gray-700`}>
        <div className="p-5">
          {title && (
            <div className="mb-4 pb-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
          )}
          <div 
            className="space-y-3"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>
        <div className={`absolute -bottom-2 ${position === 'left' ? 'left-8' : position === 'right' ? 'right-8' : 'left-1/2 transform -translate-x-1/2'} w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-900`}></div>
      </div>
    </div>
  );
};

// Format content to apply proper styling
const formatContent = (html: string): string => {
  return html
    .replace(/<strong>Description:<\/strong>/g, '<div class="mb-3"><span class="text-blue-400 font-semibold text-xs uppercase tracking-wider">Description</span><div class="mt-1 text-gray-300">')
    .replace(/<strong>Formula:<\/strong>/g, '</div></div><div class="mb-3"><span class="text-green-400 font-semibold text-xs uppercase tracking-wider">Formula</span><div class="mt-1 font-mono text-xs bg-gray-800 px-3 py-2 rounded text-gray-300">')
    .replace(/<strong>Normal Range:<\/strong>/g, '</div></div><div class="mb-3"><span class="text-yellow-400 font-semibold text-xs uppercase tracking-wider">Normal Range</span><div class="mt-1 text-gray-300">')
    .replace(/<strong>Interpretation:<\/strong>/g, '</div></div><div class="mb-3"><span class="text-orange-400 font-semibold text-xs uppercase tracking-wider">Interpretation</span><div class="mt-1 text-gray-300">')
    .replace(/<strong>Reference:<\/strong>/g, '</div></div><div class="mb-3"><span class="text-purple-400 font-semibold text-xs uppercase tracking-wider">Reference</span><div class="mt-1 text-xs text-gray-400 italic">')
    .replace(/<strong>Thresholds:<\/strong>/g, '</div></div><div class="mb-3"><span class="text-yellow-400 font-semibold text-xs uppercase tracking-wider">Thresholds</span><div class="mt-1 text-gray-300">')
    .replace(/<br\/>/g, '<br class="mb-1"/>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    + '</div></div>';
};

export default Tooltip; 