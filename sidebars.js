// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Unified sidebar for main docs instance (routeBasePath: "/")
  docSidebar: [
    {
      type: "category",
      label: "Documentation",
      items: [
        {
          type: "doc",
          id: "index",
        },
        {
          type: "doc",
          id: "how-to/sync-content",
        },
      ],
    },
    {
      type: "category",
      label: "Services",
      items: [
        {
          type: "link",
          label: "Services Overview",
          href: "/services",
        },
      ],
    },
  ],
  // Unified sidebar for services instance (routeBasePath: "/services")
  // Docusaurus uses the instance ID "services" as the sidebar name
  services: [
    {
      type: "link",
      label: "Home",
      href: "/",
    },
    {
      type: "link",
      label: "Sync Content",
      href: "/how-to/sync-content",
    },
    {
      type: "doc",
      id: "index",
    },
  ],
};

module.exports = sidebars;
