require("dotenv").config();

const path = require("path");
const {themes} = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev ? "/" : "/";

// Remote content from MetaMask docs
const { createRepo, buildRepoRawBaseUrl } = require("./src/lib/list-remote");
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
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Set a base path separate from default /docs
          editUrl: "https://github.com/Rockin-in-a-free-world/test-duplicate-data/tree/main/",
          routeBasePath: "/",
          path: "./docs",
          includeCurrentVersion: true,
          // lastVersion: "23.x",
          // versions: {
          //   //defaults to the ./docs folder
          //   // using 'development' instead of 'next' as path
          //   current: {
          //     label: "development",
          //     path: "development",
          //   },
          //   //the last stable release in the versioned_docs/version-stable
          //   "23.x": {
          //     label: "stable (23.x)",
          //   },
          //   "22.x": {
          //     label: "22.x",
          //   },
          // },
          // @ts-ignore
          // eslint-disable-next-line global-require
          include: ["**/*.md", "**/*.mdx"],
          exclude: [
            "**/_*.{js,jsx,ts,tsx,md,mdx}",
            "**/_*/**",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__tests__/**",
          ],
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
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
    [
      "@docusaurus/plugin-google-gtag",
      {
        trackingID: "G-",
        anonymizeIP: true,
      },
    ],
    [
      "@docusaurus/plugin-google-tag-manager",
      {
        containerId: "GTM-",
      },
    ],
    // Remote content: MetaMask _partials
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-partials",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, partialsPath),
        outDir: "service/reference/_partials",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        // To sync content from MetaMask docs, run: npx docusaurus download-remote-metamask-partials
        // Set to false for auto-download on start/build (adds ~2.5 min to build time)
        noRuntimeDownloads: true,
        performCleanup: false, // Keep files after build
      },
    ],
    // Remote content: MetaMask Ethereum
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-ethereum",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, ethereumPath),
        outDir: "service/reference/ethereum",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Linea
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-linea",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, lineaPath),
        outDir: "service/reference/linea",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Base
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-base",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, basePath),
        outDir: "service/reference/base",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Concepts
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-concepts",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, conceptsPath),
        outDir: "service/concepts",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Get Started
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-get-started",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, getStartedPath),
        outDir: "service/get-started",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Gas API
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-gas-api",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, gasApiPath),
        outDir: "service/reference/gas-api",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask IPFS
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-ipfs",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, ipfsPath),
        outDir: "service/reference/ipfs",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask How-To
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-how-to",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, howToPath),
        outDir: "service/how-to",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
    // Remote content: MetaMask Tutorials
    [
      "docusaurus-plugin-remote-content",
      {
        name: "metamask-tutorials",
        sourceBaseUrl: buildRepoRawBaseUrl(metamaskRepo, tutorialsPath),
        outDir: "service/tutorials",
        documents: [], // Empty array since noRuntimeDownloads: true - files already downloaded
        noRuntimeDownloads: true,
        performCleanup: false,
      },
    ],
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
