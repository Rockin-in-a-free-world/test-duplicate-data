/**
 * Content Processor
 * Main orchestrator that processes all downloaded files
 * Uses modular processors for links, images, components, and partials
 */

const fs = require("fs");
const path = require("path");
const { getAllMarkdownFiles, buildPartialImportMap } = require("./file-scanner");
const { processLinks } = require("./link-processor");
const { processImages } = require("./image-processor");
const { processComponents } = require("./component-processor");
const { processPartials } = require("./partial-processor");
const { writeReports } = require("./reporter");

/**
 * Process all downloaded files
 */
async function processAllFiles(docsPath) {
  console.log(`[content-processor] Scanning for downloaded files...`);
  
  const files = getAllMarkdownFiles(docsPath);
  console.log(`[content-processor] Found ${files.length} file(s) to process`);
  
  if (files.length === 0) {
    return {
      brokenLinks: [],
      imageFixes: [],
      componentFixes: [],
    };
  }
  
  // Build map of partial files to their importing files
  const partialImportMap = buildPartialImportMap(files, docsPath);
  if (partialImportMap.size > 0) {
    console.log(`[content-processor] Found ${partialImportMap.size} partial file(s) with imports`);
  }
  
  const allBrokenLinks = [];
  const allImageFixes = [];
  const allComponentFixes = [];
  
  // Process each file
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativeFilePath = path.relative(docsPath, filePath);
    
    // Step 0: Fix comparison operators that MDX misinterprets as JSX
    // First, restore ALL incorrectly replaced HTML entities in JSX/HTML tags
    // Use a comprehensive approach: restore &gt; and &lt; in all tag contexts
    
    // Restore &lt; in closing tags (</tag>)
    content = content.replace(/&lt;\//g, '</');
    // Restore &gt; in self-closing tags (/>)
    content = content.replace(/\/&gt;/g, '/>');
    
    // Restore ALL &gt; and &lt; that appear within tag boundaries
    // Match any <...> pattern and restore entities inside it
    content = content.replace(/<[^>]*>/g, (match) => {
      // Restore &gt; and &lt; inside the tag
      return match.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
    });
    
    // Also handle cases where &gt; appears at the end of a tag that spans multiple lines
    // Restore &gt; that appears after attributes but before a newline
    content = content.replace(/&gt;(\s*\n\s*<)/g, '>$1');
    
    // Restore any incorrectly replaced <= and >= in MDX expressions back to original
    content = content.replace(/\{`<=`\}/g, '<=');
    content = content.replace(/\{`>=`\}/g, '>=');
    
    // Now carefully replace <= and >= only when they're comparison operators in text
    // Match patterns like "must be <= 63" or "length >= 10" but avoid HTML/JSX tags
    const lines = content.split('\n');
    const processedLines = lines.map((line) => {
      // Skip lines with HTML/JSX tags (contain < and > with attributes or closing tags)
      if (line.includes('<') && line.includes('>') && 
          (line.includes('class=') || line.includes('src=') || line.includes('alt=') || 
           line.includes('className=') || line.includes('/>') || line.includes('</') ||
           /<[a-zA-Z]/.test(line))) {
        return line;
      }
      // Skip code blocks
      if (line.trim().startsWith('```') || line.match(/^[ \t]{4,}/)) {
        return line;
      }
      // Only replace in text that clearly has comparison operators
      // Match "<= " or ">= " followed by a number, wrap in code span to escape
      return line.replace(/(\w+\s+)(<=|>=)(\s+\d+)/g, (match, before, operator, after) => {
        return before + '`' + operator + '`' + after;
      });
    });
    content = processedLines.join('\n');
    
    // Step 1: Fix partial import paths
    const { content: partialFixed, modified: partialModified } = processPartials(content, filePath, docsPath);
    content = partialFixed;
    
    // Step 2: Fix image paths (using remark plugin)
    const { content: imageFixed, modified: imageModified, imageFixes } = await processImages(content, filePath);
    content = imageFixed;
    if (imageModified) {
      imageFixes.forEach(fix => {
        allImageFixes.push({
          file: relativeFilePath,
          original: fix.original,
          new: fix.new,
          image: fix.image
        });
      });
    }
    
    // Step 3: Fix component imports
    const { content: componentFixed, modified: componentModified, componentFixes } = processComponents(content, filePath);
    content = componentFixed;
    if (componentModified) {
      componentFixes.forEach(fix => {
        allComponentFixes.push({
          file: relativeFilePath,
          type: fix.type,
          name: fix.name,
          path: fix.path,
          import: fix.import
        });
      });
    }
    
    // Step 4: Process links (using remark plugins + broken link detection)
    const { content: fixedContent, modified: linksModified, brokenLinks } = await processLinks(content, filePath, partialImportMap, docsPath);
    content = fixedContent;
    
    if (linksModified) {
      allBrokenLinks.push(...brokenLinks);
    }
    
    // Write file if modified
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
  
  return {
    brokenLinks: allBrokenLinks,
    imageFixes: allImageFixes,
    componentFixes: allComponentFixes,
  };
}

module.exports = {
  processAllFiles,
  writeReports,
};

