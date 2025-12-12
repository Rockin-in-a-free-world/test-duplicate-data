/**
 * Image Processor Module
 * Handles image path fixes using regex (safe for both .md and .mdx files)
 */

/**
 * Process images in content using regex (avoids corrupting JSX in MDX files)
 */
async function processImages(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match require() statements for images
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+)["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `require('@site/static/img/${imagePath}')`, image: imagePath });
      return `require('@site/static/img/${imagePath}')`;
    }
  );
  
  // Match src={require(...)} patterns
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+)["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `src={require('@site/static/img/${imagePath}').default}`, image: imagePath });
      return `src={require('@site/static/img/${imagePath}').default}`;
    }
  );
  
  // Handle markdown image syntax
  content = content.replace(
    /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+)\)/g,
    (match, alt, dots, imagePath) => {
      modified = true;
      const newPath = `<img src={require('@site/static/img/${imagePath}').default} alt="${alt}" />`;
      imageFixes.push({ original: match, new: newPath, image: imagePath });
      return newPath;
    }
  );
  
  return { content, modified, imageFixes };
}

module.exports = {
  processImages,
};

