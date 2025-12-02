const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

/**
 * Find all _config.yml files in the docs directory
 * @param {string} docsPath - Path to docs directory
 * @returns {Array<{configPath: string, dirPath: string}>}
 */
function findConfigFiles(docsPath) {
  const configs = [];
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file === "_config.yml") {
        configs.push({
          configPath: filePath,
          dirPath: dir,
        });
      }
    }
  }
  
  if (fs.existsSync(docsPath)) {
    walkDir(docsPath);
  }
  
  return configs;
}

/**
 * Read and parse a config file
 * @param {string} configPath - Path to _config.yml file
 * @returns {Object|null} Parsed config or null if invalid
 */
function readConfig(configPath) {
  try {
    const content = fs.readFileSync(configPath, "utf8");
    const config = yaml.load(content);
    
    if (!config.source) {
      console.warn(`Config at ${configPath} missing 'source' field`);
      return null;
    }
    
    if (!config.include || !Array.isArray(config.include)) {
      console.warn(`Config at ${configPath} missing 'include' field or it's not an array`);
      return null;
    }
    
    return {
      source: config.source,
      include: config.include,
      exclude: config.exclude || [],
      copy_images: config.copy_images || false,
      image_dest: config.image_dest || null,
      partials_source: config.partials_source || null,
    };
  } catch (error) {
    console.error(`Error reading config at ${configPath}:`, error.message);
    return null;
  }
}

module.exports = {
  findConfigFiles,
  readConfig,
};

