const DEFAULT_THEME_ID = "vera";
const DEFAULT_PAGE_LAYOUT_ID = "centered";

const THEME_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "vera",
    label: "Vera",
    description: "Midnight neon with soft gradients and terminal-style code blocks."
  }),
  Object.freeze({
    id: "linen",
    label: "Linen",
    stylesheet: "themes/linen.css",
    description: "Low-glare midnight editorial for long-form reading."
  }),
  Object.freeze({
    id: "terminal",
    label: "Terminal",
    stylesheet: "themes/terminal.css",
    description: "Monochrome CRT console with amber system accents."
  }),
  Object.freeze({
    id: "blueprint",
    label: "Blueprint",
    stylesheet: "themes/blueprint.css",
    description: "Technical drawing board with precise drafting lines."
  }),
  Object.freeze({
    id: "bauhaus",
    label: "Bauhaus",
    stylesheet: "themes/bauhaus.css",
    description: "Dark modernist poster with primary-color geometry."
  }),
  Object.freeze({
    id: "nocturne",
    label: "Nocturne",
    stylesheet: "themes/nocturne.css",
    description: "Black-tie editorial with brass, oxblood, and velvet depth."
  }),
  Object.freeze({
    id: "forest",
    label: "Forest",
    stylesheet: "themes/forest.css",
    description: "Rain-soaked evergreen study with moss and firefly accents."
  }),
  Object.freeze({
    id: "graphite",
    label: "Graphite",
    stylesheet: "themes/graphite.css",
    description: "Restrained monochrome focus mode with crisp editorial rhythm."
  }),
  Object.freeze({
    id: "synthwave",
    label: "Synthwave",
    stylesheet: "themes/synthwave.css",
    description: "Neon horizon, arcade glow, and retro-future grid energy."
  }),
  Object.freeze({
    id: "ember",
    label: "Ember",
    stylesheet: "themes/ember.css",
    description: "Industrial charcoal workshop with copper and heat accents."
  }),
  Object.freeze({
    id: "abyss",
    label: "Abyss",
    stylesheet: "themes/abyss.css",
    description: "Deep-ocean calm with bioluminescent cyan and cobalt depth."
  }),
  Object.freeze({
    id: "rosewood",
    label: "Rosewood",
    stylesheet: "themes/rosewood.css",
    description: "Plum library, rose ink, and warm mahogany reading room."
  }),
  Object.freeze({
    id: "cathedral",
    label: "Cathedral",
    stylesheet: "themes/cathedral.css",
    description: "Midnight stone, stained glass, and jewel-toned geometry."
  }),
  Object.freeze({
    id: "aurora",
    label: "Aurora",
    stylesheet: "themes/aurora.css",
    description: "Polar night with soft northern-light ribbons and ice accents."
  }),
  Object.freeze({
    id: "inkstone",
    label: "Inkstone",
    stylesheet: "themes/inkstone.css",
    description: "Sumi-black study with vermilion seals and quiet paper grain."
  })
]);

const PAGE_LAYOUT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "centered",
    label: "Centered",
    description: "Keep the current centered reading column used by each theme."
  }),
  Object.freeze({
    id: "fullWidth",
    label: "Full Width",
    stylesheet: "layouts/full-width.css",
    description: "Use the full Markdown preview width while keeping the selected theme."
  })
]);

const MANAGED_THEME_PATHS = new Set(
  THEME_DEFINITIONS.filter((theme) => theme.stylesheet).map((theme) =>
    normalizeStylesheet(theme.stylesheet)
  )
);

const MANAGED_LAYOUT_PATHS = new Set(
  PAGE_LAYOUT_DEFINITIONS.filter((layout) => layout.stylesheet).map((layout) =>
    normalizeStylesheet(layout.stylesheet)
  )
);

function getTheme(themeId) {
  return THEME_DEFINITIONS.find((theme) => theme.id === themeId);
}

function getPageLayout(pageLayoutId) {
  return PAGE_LAYOUT_DEFINITIONS.find((layout) => layout.id === pageLayoutId);
}

function replaceManagedThemeStylesheet(styles, nextStylesheet, previousStylesheet) {
  return replaceManagedStylesheet(styles, nextStylesheet, previousStylesheet, MANAGED_THEME_PATHS);
}

function replaceManagedLayoutStylesheet(styles, nextStylesheet, previousStylesheet) {
  return replaceManagedStylesheet(styles, nextStylesheet, previousStylesheet, MANAGED_LAYOUT_PATHS);
}

function replaceManagedStylesheet(
  styles,
  nextStylesheet,
  previousStylesheet,
  managedStylesheetPaths = MANAGED_THEME_PATHS
) {
  const preservedStyles = (Array.isArray(styles) ? styles : []).filter(
    (stylesheet) => !isManagedStylesheet(stylesheet, previousStylesheet, managedStylesheetPaths)
  );

  if (
    nextStylesheet &&
    !preservedStyles.some(
      (stylesheet) => normalizeStylesheet(stylesheet) === normalizeStylesheet(nextStylesheet)
    )
  ) {
    preservedStyles.push(nextStylesheet);
  }

  return preservedStyles;
}

function isManagedStylesheet(
  stylesheet,
  previousStylesheet,
  managedStylesheetPaths = MANAGED_THEME_PATHS
) {
  const normalizedStylesheet = normalizeStylesheet(stylesheet);
  const normalizedPreviousStylesheet = normalizeStylesheet(previousStylesheet);

  if (!normalizedStylesheet) {
    return false;
  }

  if (normalizedPreviousStylesheet && normalizedStylesheet === normalizedPreviousStylesheet) {
    return true;
  }

  if (!normalizedStylesheet.includes("/abdulrahman-elsmmany.markdown-preview-themes-")) {
    return false;
  }

  for (const managedPath of managedStylesheetPaths) {
    if (normalizedStylesheet.endsWith(`/${managedPath}`)) {
      return true;
    }
  }

  return false;
}

function isManagedLayoutStylesheet(stylesheet, previousStylesheet) {
  return isManagedStylesheet(stylesheet, previousStylesheet, MANAGED_LAYOUT_PATHS);
}

function normalizeStylesheet(stylesheet) {
  return typeof stylesheet === "string" ? stylesheet.replaceAll("\\", "/").toLowerCase() : "";
}

module.exports = {
  DEFAULT_PAGE_LAYOUT_ID,
  DEFAULT_THEME_ID,
  PAGE_LAYOUT_DEFINITIONS,
  THEME_DEFINITIONS,
  getPageLayout,
  getTheme,
  isManagedStylesheet,
  isManagedLayoutStylesheet,
  normalizeStylesheet,
  replaceManagedLayoutStylesheet,
  replaceManagedStylesheet,
  replaceManagedThemeStylesheet
};
