import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [renderedContent, setRenderedContent] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      // Step 1: Extract math expressions before markdown processing
      const mathPlacements: { [key: string]: string } = {};
      let mathCounter = 0;
      
      // Process block math first ($$...$$)
      let processedContent = content.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
        const placeholder = `KATEX_BLOCK_MATH_${mathCounter}_KATEX`;
        try {
          // Helper function to process boxed content
          const processBoxed = (mathContent: string) => {
            return mathContent.replace(/\\boxed\{([^}]+)\}/g, (_, boxedContent) => {
              return `\\begin{aligned}\\boxed{${boxedContent}}\\end{aligned}`;
            });
          };
          
          const processedMath = processBoxed(math);
          const renderedMath = katex.renderToString(processedMath, {
            displayMode: true,
            throwOnError: false,
            trust: true,
            macros: {
              "\\boxed": "\\fbox{#1}"
            }
          });
          mathPlacements[placeholder] = renderedMath;
        } catch (error) {
          console.error('KaTeX block math error:', error);
          mathPlacements[placeholder] = match; // Keep original if error
        }
        mathCounter++;
        return placeholder;
      });
      
      // Process inline math (single $...$)
      processedContent = processedContent.replace(/\$([^$]+)\$/g, (match, math) => {
        const placeholder = `KATEX_INLINE_MATH_${mathCounter}_KATEX`;
        try {
          // Helper function to process boxed content
          const processBoxed = (mathContent: string) => {
            return mathContent.replace(/\\boxed\{([^}]+)\}/g, (_, boxedContent) => {
              return `\\begin{aligned}\\boxed{${boxedContent}}\\end{aligned}`;
            });
          };
          
          const processedMath = processBoxed(math);
          const renderedMath = katex.renderToString(processedMath, {
            displayMode: false,
            throwOnError: false,
            trust: true,
            macros: {
              "\\boxed": "\\fbox{#1}"
            }
          });
          mathPlacements[placeholder] = renderedMath;
        } catch (error) {
          console.error('KaTeX inline math error:', error);
          mathPlacements[placeholder] = match; // Keep original if error
        }
        mathCounter++;
        return placeholder;
      });
      
      // Step 2: Process markdown on the content with math placeholders
      const html = await marked(processedContent, {
        breaks: true,
        gfm: true
      });
      
      // Step 3: Replace placeholders with rendered math
      let finalHtml = html;
      Object.keys(mathPlacements).forEach(placeholder => {
        // Use global replace to handle multiple occurrences
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        finalHtml = finalHtml.replace(regex, mathPlacements[placeholder]);
      });
      
      // Debug: Check if any placeholders remain
      const remainingPlaceholders = finalHtml.match(/KATEX_[A-Z_]+_\d+_KATEX/g);
      if (remainingPlaceholders) {
        console.log('Remaining math placeholders:', remainingPlaceholders);
        console.log('Available math placements:', Object.keys(mathPlacements));
      }
      
      setRenderedContent(finalHtml);
    };
    
    renderMarkdown();
  }, [content]);

  return (
    <div 
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
      style={{
        lineHeight: 1.6,
        fontSize: '1em',
        color: 'inherit'
      }}
    />
  );
}; 