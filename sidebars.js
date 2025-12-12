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
  // This sidebar includes both services items AND main docs items for global context
  services: async (generatorArgs) => {
    // Helper function to convert doc items from default instance to link items
    const convertDocsToLinks = (items) => {
      return items.map(item => {
        if (item.type === "doc") {
          // Convert doc items to link items pointing to the default instance
          const docId = item.id;
          const href = docId === "index" ? "/" : `/${docId}`;
          return {
            type: "link",
            label: item.label || docId,
            href: href,
          };
        } else if (item.type === "category" && item.items) {
          // Recursively convert category items
          return {
            ...item,
            items: convertDocsToLinks(item.items),
          };
        }
        return item;
      });
    };
    
    // Get main docs sidebar items and convert doc items to links
    // Filter out the "Services" category since we'll add our own with actual services items
    const mainDocsSidebar = convertDocsToLinks(sidebars.docSidebar)
      .filter(item => !(item.type === "category" && item.label === "Services"));
    
    // Get services-specific items
    const servicesItems = [
      {
        type: "doc",
        id: "index",
      },
    ];
    
    // Combine: main docs items first, then services items
    return [
      ...mainDocsSidebar,
      {
        type: "category",
        label: "Services",
        items: servicesItems,
      },
    ];
  },
};

module.exports = sidebars;
