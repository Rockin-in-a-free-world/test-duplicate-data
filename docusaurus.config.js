require("dotenv").config();

const {themes} = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev ? "/" : "/";

// Remote content from MetaMask docs
const { createRepo, buildRepoRawBaseUrl, listDocuments } = require("./src/lib/list-remote");
const metamaskRepo = createRepo("MetaMask", "metamask-docs", "main");
const partialsPath = "services/reference/_partials";
const ethereumPath = "services/reference/ethereum";
const lineaPath = "services/reference/linea";
const basePath = "services/reference/base";
const conceptsPath = "services/concepts";
const getStartedPath = "services/get-started";
const gasApiPath = "services/reference/gas-api";
const ipfsPath = "services/reference/ipfs";
const howToPath = "services/how-to";
const tutorialsPath = "services/tutorials";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Test Documentation",
  tagline:
    "This is an experimental site.",
  url: "https://docs-template.consensys.io",
  baseUrl,
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "throw",
    }
  },
  favicon: "img/favicon.ico",
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Consensys", // Usually your GitHub org/user name.
  projectName: "docs-template", // Usually your repo name.
  deploymentBranch: "gh-pages", // Github Pages deploying branch

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: false, // Disable default docs plugin - we'll add it explicitly in plugins
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // algolia: {
      //   // The application ID provided by Algolia
      //   appId: "NSRFPEJ4NC",

      //   // Public API key: it is safe to commit it
      //   apiKey: "cea41b975ad6c9a01408dfda6e0061d3",

      //   indexName: "docs-template", // Ping #documentation on Slack for your index name

      //   // Optional: see doc section below
      //   contextualSearch: true,

      //   // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
      //   externalUrlRegex: "external\\.com|domain\\.com",

      //   // Optional: Algolia search parameters
      //   searchParameters: {},

      //   // Optional: path for search page that enabled by default (`false` to disable it)
      //   searchPagePath: "search",

      //   // ... other Algolia params
      // },
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      docs: {
        sidebar: {
          hideable: true,
        },
      },
      navbar: {
        title: "Test Documentation",
        logo: {
          alt: "Logo",
          src: "img/logo.svg",
          srcDark: "img/logo_dark.svg",
          width: 32,
          height: 32,
        },
        items: [
          {
            href: "https://github.com/Rockin-in-a-free-world/test-duplicate-data",
            className: "header-github-link",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              {
                label: "Overview",
                to: "/",
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Test Documentation`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      languageTabs: [
        {
          highlight: "bash",
          language: "curl",
          logoClass: "bash",
        },
        {
          highlight: "python",
          language: "python",
          logoClass: "python",
        },
        {
          highlight: "go",
          language: "go",
          logoClass: "go",
        },
        {
          highlight: "javascript",
          language: "nodejs",
          logoClass: "nodejs",
        },
      ],
    }),
  plugins: [
    // Main docs instance (routeBasePath: "/")
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "default",
        sidebarItemsGenerator: async () => {
          const sidebars = require("./sidebars.js");
          return sidebars.docSidebar;
        },
        routeBasePath: "/",
        path: "./docs",
        includeCurrentVersion: true,
        include: ["**/*.md", "**/*.mdx"],
        exclude: [
          "**/_*.{js,jsx,ts,tsx,md,mdx}",
          "**/_*/**",
          "**/*.test.{js,jsx,ts,tsx}",
          "**/__tests__/**",
        ],
        beforeDefaultRemarkPlugins: [],
        beforeDefaultRehypePlugins: [],
        showLastUpdateAuthor: false,
        showLastUpdateTime: false,
      },
    ],
    // Remote content plugin: fetches content from MetaMask repo
    // Only load during build, not during start (dev mode)
    // Plugins are always in the config, but noRuntimeDownloads prevents auto-download on start
    // The `get-remote` script explicitly triggers downloads via CLI commands
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-partials",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, partialsPath),
        outDir: "docs/services/reference/_partials",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx"], [], partialsPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-ethereum",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, ethereumPath),
        outDir: "docs/services/reference/ethereum",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], ethereumPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-linea",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, lineaPath),
        outDir: "docs/services/reference/linea",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], lineaPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-base",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, basePath),
        outDir: "docs/services/reference/base",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], basePath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-concepts",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, conceptsPath),
        outDir: "docs/services/concepts",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], conceptsPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-get-started",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, getStartedPath),
        outDir: "docs/services/get-started",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], getStartedPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-gas-api",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, gasApiPath),
        outDir: "docs/services/reference/gas-api",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], gasApiPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-ipfs",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, ipfsPath),
        outDir: "docs/services/reference/ipfs",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], ipfsPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-how-to",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, howToPath),
        outDir: "docs/services/how-to",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], howToPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-tutorials",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, tutorialsPath),
        outDir: "docs/services/tutorials",
        documents: () => listDocuments(metamaskRepo, ["**/*.mdx", "**/*.md"], [], tutorialsPath),
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Google Analytics and GTM plugins disabled (uncomment and configure when needed)
    // [
    //   "@docusaurus/plugin-google-gtag",
    //   {
    //     trackingID: "G-XXXXXXXXXX",
    //     anonymizeIP: true,
    //   },
    // ],
    // [
    //   "@docusaurus/plugin-google-tag-manager",
    //   {
    //     containerId: "GTM-XXXXXXX",
    //   },
    // ],
    // This is how redirects are done
    // [
    //   "@docusaurus/plugin-client-redirects",
    //   {
    //     redirects: [
    //       {
    //         from: "/HowTo/Get-Started/Installation-Options/Install-Binaries",
    //         to: "/get-started/install/install-binaries",
    //       },
    //     ],
    //     // its quite odd here in that its back to front - replace(to, from)
    //     createRedirects(existingPath) {
    //       if (existingPath.includes("/development")) {
    //         return [
    //           existingPath.replace("/development", "/en/latest"),
    //           existingPath.replace("/development", "/latest"),
    //         ];
    //       }
    //       if (existingPath.includes("/")) {
    //         return [existingPath.replace("/", "/stable")];
    //       }
    //       return undefined; // Return a falsy value: no redirect created
    //     },
    //   },
    // ],
    // Content processor: processes already-downloaded files (from remote-content)
    // Applies transformations: links, images, components based on YAML configs
    "./src/plugins/docusaurus-plugin-config-driven-sync",
    // Second docs instance for services directory
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "services",
        path: "./services",
        routeBasePath: "/services",
        sidebarItemsGenerator: async (args) => {
          const sidebars = require("./sidebars.js");
          return await sidebars.services(args);
        },
        sidebarCollapsible: true,
        sidebarCollapsed: false,
        include: ["**/*.md", "**/*.mdx"],
        exclude: [
          "**/_*.{js,jsx,ts,tsx,md,mdx}",
          "**/_*/**",
          "**/*.test.{js,jsx,ts,tsx}",
          "**/__tests__/**",
        ],
        showLastUpdateAuthor: false,
        showLastUpdateTime: false,
      },
    ],
  ],
  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        docsRouteBasePath: "/",
        hashed: true,
        indexBlog: false,
      },
    ],
  ],
};

module.exports = config;
